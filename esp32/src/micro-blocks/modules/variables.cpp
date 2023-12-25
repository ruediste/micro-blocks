#include "variables.h"
#include "../machine.h"
#include <Arduino.h>
#include "../resourcePool.h"

namespace variablesModule
{
    void setup()
    {
        // setVar32
        machine::registerFunction(
            4,
            []()
            {
                auto value = machine::popUint32();
                auto offset = machine::popUint16();
                *((uint32_t *)machine::variable(offset)) = value;
            });

        // getVar32
        machine::registerFunction(
            5,
            []()
            {
                auto offset = machine::popUint16();
                machine::pushUint32(*((uint32_t *)machine::variable(offset)));
            });

        // variablesGetResourceHandle
        machine::registerFunction(
            28,
            []()
            {
                auto offset = machine::popUint16();
                auto value = *(resourcePool::ResourceHandleBase **)machine::variable(offset);
                value->incRef();
                machine::pushUint32(reinterpret_cast<uint32_t>(value));
            });

        // variablesSetResourceHandle
        machine::registerFunction(
            29,
            []()
            {
                auto value = reinterpret_cast<resourcePool::ResourceHandleBase *>(machine::popUint32());
                auto offset = machine::popUint16();
                auto oldValue = *(resourcePool::ResourceHandleBase **)machine::variable(offset);
                if (oldValue != NULL)
                    oldValue->decRef();
                *((resourcePool::ResourceHandleBase **)machine::variable(offset)) = value;
            });
    }
}