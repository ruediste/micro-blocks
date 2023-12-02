# Micro Blocks

Micro Blocks allows programming microcontrollers using a block-based programming language. It uses a simple virtual machine for block execution, which greatly simplifies the compilation of the blocks into executable code. This allows the compilation to happen in the browser without adding a lot of complexity. The virtual machine is written in C++ and can easily be ported to various platforms. The VM allows to easily call C functions from the blocks, thus simplifying the integration of existing libraries.

The main target of the project is the [ESP32](https://www.espressif.com/en/products/socs/esp32/overview) microcontroller. With the integrated WiFi support, the blockly frontend can be hosted directly on the microcontroller. The compilation is performed on the client and the code can be executed on the microcontroller right away, allowing for a very simple development workflow.

The frontend is based on the [Blockly](https://developers.google.com/blockly/) library.

## VM Structure

The VM is based on an untyped stack. The VM is only concerned with managing the stack and invoking function. All actual operations are performed by the invoked functions. Therefor the VM has no notion of data types, all data is just a sequence of bytes. The VM is designed to be simple and easy to understand, not to be fast.

All code is executed in the context of a thread. Each thread has it's own stack. Switching between the threads is done using cooperative multi tasking. Thus the threads invoke the `yield` instruction when they are ready to be suspended. The resumption of a thread lies outside of the responsibility of the VM. Typically, some external event will occur and some callback will determine that a thread needs to be resumed.

When the VM is started, all threads will be executed, one after the other. Typically, the threads will perform some setup, register themselves with some events and then invoke a function which causes the thread to yield.

In addition, there is a memory area for globals, containing the global variables. This area can be accessed by all threads.

As there can only be a single thread executing at any given time, handling concurrency is relatively simple, while still allowing multiple blocks to seemingly execute in parallel.

The VM uses little endian byte order.

## OpCodes

| OpCode      | Mnemonic | Description                                                         |
| ----------- | -------- | ------------------------------------------------------------------- |
| `00ss llll` | push     | push the supplied data with length `llll` to the stack              |
| `01ss oooo` | jump     | jump by the specified offset `oooo`                                 |
| `10ss oooo` | jz       | jump by the specified offset `oooo` if the top of the stack is zero |
| `11ss nnnn` | call     | call the given function `nnnn`                                      |

Parameters (`llll`, `oooo`, `nnnn`) are encoded in the opcode as follows:

Argument size `ss`

- `00`: the argument is contained in the lower 4 bits of the opcode
- `01`: the argument is contained in the byte following the opcode
- `10`: the argument is contained in the two bytes following the opcode
- `11`: reserved

The least significant byte is stored after the opcode. The most significant bits are always stored in the opcode. If the parameter is signed, the sign bit is always stored in bit 3 of the opcode.

Thus a jump with an offset of -60000 (binary two's complement 32 bit `1111 1111 1111 1111 0001 0101 1010 0000`) would be encoded as `0110 1111 | 0101 1010 | 1111 0001`. To decode, the four lower bits of the opcode have to be sign-extended to a 16 bit word and then concatenated with the two bytes following the opcode to form the 32 bit jump offset.

### Push

Push some data to the stack. The length of the data is specified by the length parameter, either in the lower 4 bits of the opcode or in the following bytes. The data to push is following the opcode. The bytes are pushed in the order they are specified, thus the last byte will be on top of the stack.

### Jump

Unconditional jump by by a signed offset. The offset is specified by the offset parameter, either in the lower 4 bits of the opcode and for larger offsets in the following bytes. The offset is relative to the address of the jump instruction if the offset is negative. If the offset is positive, it is relative to the address following the jump instruction.

### JZ

Conditional jump by by a signed offset, if the top of the stack is zero. See the description of jump for the interpretation of the offset parameter.

### Call

Call of a function. A number is assigned to each available function. This number is the argument to the call instruction.

The invoked instruction is responsible for all required stack manipulation. By convention, arguments are processed from left to right, thus the right most argument is on the top of the stack when the function is called. The arguments are popped from the stack and the result is pushed back onto the stack.

## Output File Format

The file consists of the following sections:

1. Header
1. Thread Table
1. Threads

### Header

| Length | Description                  |
| ------ | ---------------------------- |
| 2      | Magic bytes 0x4D, 0x42, 'MB' |
| 1      | Version, currently 0         |
| 2      | Number of threads            |
| 2      | Memory size                  |

The memory size is the amount of memory required to run the program. The globals start at offset zero. The stack of the threads follows. The offset of each stack is stored in the thread table. The spacing of the stack happens according to the maximum stack required by each thread.

### Thread Table Entry

| Length | Description                                         |
| ------ | --------------------------------------------------- |
| 2      | File Offset of the start of the code for the thread |
| 2      | Thread Stack Offset                                 |

### Thread

Each thread just consists of the code for the thread
