# VM Implementation

The core of the VM is contained in [machine.cpp](../esp32/src/micro-blocks/machine.cpp). It takes care of parsing the bytecode file, allocating the required memory and executing the bytecode. The VM is single threaded, thus there is no need for any locking. Threads are started using the `runTread()` function and suspend after `suspendThread()` is called. Functions are registered using `registerFunction()`.

All specific functionality is contained in modules. There are the modules implementing the default blockly blocks and modules for more specific functionality, often peripherial related. Each module can provide three functions:

- `setup()` to register functions and initialize peripherials
- `loop()` which is called periodically and used to resume threads
- `reset()` to clear all internal state when a new program is loaded

These functions are invoked from [modules.cpp](../esp32/src/micro-blocks/modules/modules.cpp)
