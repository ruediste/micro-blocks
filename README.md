# Micro Blocks

Micro Blocks allows programming microcontrollers using a block-based programming language. It uses a simple virtual machine for block execution, which greatly simplifies the compilation of the blocks into executable code. This allows the compilation to happen in the browser without adding a lot of complexity. The virtual machine is written in C++ and can easily be ported to other platforms. The VM allows to call C functions easily from the blocks, thus simplifying the integration of existing libraries.

The main target of the project is the [ESP32](https://www.espressif.com/en/products/socs/esp32/overview) microcontroller. With the integrated WiFi support, the blockly frontend can be hosted directly on the microcontroller. The compilation is performed on the client and the code can be executed on the microcontroller right away, allowing for a very simple development workflow.

The frontend is based on the [Blockly](https://developers.google.com/blockly/) library.

## Contents

- [VM Specification](doc/VmSpecification.md)
- [VM Implementation](doc/VmImplementation.md)
