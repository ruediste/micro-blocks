#include "machine.h"
#include <stdlib.h>
#include <Arduino.h>
namespace machine
{

    MachineFunction functions[256];

    uint8_t *code = NULL;
    uint8_t *memory = NULL;

    typedef struct
    {
        uint16_t pc;
        uint16_t sp;
    } ThreadInfo;

    typedef struct __packed
    {
        uint8_t magic[2];
        uint8_t version;
        uint16_t threadCount;
        uint16_t memorySize;
    } CodeHeader;

    typedef struct __packed
    {
        uint16_t codeOffset;
        uint16_t stackOffset;
    } CodeThreadTableEntry;

    ThreadInfo *threads = NULL;

    uint16_t currentThreadNr;
    bool threadYielded;

    ThreadInfo &currentThread()
    {
        return threads[currentThreadNr];
    }

    uint8_t popUint8()
    {
        return memory[--currentThread().sp];
    }

    uint16_t popUint16()
    {
        currentThread().sp -= 2;
        return *(uint16_t *)(memory + currentThread().sp);
    }

    void pushUint8(uint8_t value)
    {
        memory[currentThread().sp++] = value;
    }

    void pushUint16(uint16_t value)
    {
        *((uint16_t *)(memory + currentThread().sp)) = value;
    }

    void registerFunction(uint16_t functionNr, MachineFunction function)
    {
        functions[functionNr] = function;
    }

    void yieldCurrentThread()
    {
        threadYielded = true;
    }

    int32_t readArgument(uint16_t &pc, bool isSigned)
    {
        int32_t result = 0;
        uint8_t opcode = code[pc++];

        if (isSigned)
            result = (opcode & 0xf) | ((opcode & 0b1000) ? (int32_t)~0xf : 0);
        else
            result = opcode & 0xf;

        switch (opcode >> 4 & 0b11)
        {
        case 0b00:
            return result;
        case 0b01:
            return result << 8 | code[pc++];
        case 0b10:
            return result << 16 | code[pc++] | code[pc++] << 8;
        }
        return result;
    }

    CodeHeader &header()
    {
        return *(CodeHeader *)code;
    }

    CodeThreadTableEntry &threadTableEntry(uint16_t threadNr)
    {
        return *(CodeThreadTableEntry *)(code + sizeof(CodeHeader) + threadNr * sizeof(CodeThreadTableEntry));
    }

    void setup()
    {
    }

    void runThread(uint16_t threadNr)
    {
        Serial.println(String("Running Thread ") + threadNr);
        currentThreadNr = threadNr;
        threadYielded = false;
        ThreadInfo &thread = threads[threadNr];

        while (!threadYielded)
        {
            auto initialPc = thread.pc;
            switch (code[thread.pc] >> 6)
            {
            case 0b00:
            {
                int32_t bytes = readArgument(thread.pc, false);
                for (auto i = 0; i < bytes; i++)
                {
                    memory[thread.sp++] = code[thread.pc++];
                }
                break;
            }
            case 0b01:
            {
                auto offset = readArgument(thread.pc, true);
                if (offset > 0)
                    thread.pc += offset;
                else
                    thread.pc = initialPc + offset;
                break;
            }
            case 0b10:
            {
                int32_t offset = readArgument(thread.pc, true);
                if (memory[--thread.sp] == 0)
                {
                    if (offset > 0)
                        thread.pc += offset;
                    else
                        thread.pc = initialPc + offset;
                }
                break;
            }
            case 0b11:
            {
                int32_t functionNr = readArgument(thread.pc, true);
                functions[functionNr]();
                break;
            }
            default:
                return;
            }
        }

        Serial.println(String("Thread ") + threadNr + " yielded");
    }

    void applyCode(uint8_t *buf, size_t size)
    {
        if (code != NULL)
        {
            free(code);
        }

        if (memory != NULL)
        {
            free(memory);
        }
        if (threads != NULL)
        {
            free(threads);
        }
        code = buf;
        memory = (uint8_t *)malloc(header().memorySize);
        threads = (ThreadInfo *)malloc(header().threadCount * sizeof(ThreadInfo));
        for (auto i = 0; i < header().threadCount; i++)
        {
            threads[i].pc = threadTableEntry(i).codeOffset;
            threads[i].sp = threadTableEntry(i).stackOffset;
        }

        for (uint16_t i = 0; i < header().threadCount; i++)
        {
            Serial.println(String("Initial start of thread ") + i);
            runThread(i);
        }
    }

    void loop()
    {
    }
}