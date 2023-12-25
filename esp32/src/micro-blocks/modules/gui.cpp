#include "gui.h"
#include "../machine.h"
#include <vector>
#include <memory>
#include <stdint.h>
#include "../../websocket.h"

namespace guiModule
{
    enum class GuiElementType : uint8_t
    {
        BUTTON
    };

    struct __attribute__((packed)) GuiElementData
    {
        GuiElementType type;
        uint8_t x, y, colSpan, rowSpan;

        GuiElementData(GuiElementType type) : type(type) {}

        bool overlaps(GuiElementData &other)
        {
            return x <= other.x + other.colSpan && x + colSpan > other.x &&
                   y <= other.y + other.rowSpan && y + rowSpan > other.y;
        }
    };

    struct GuiElement
    {
        size_t dataSize;
        GuiElement(size_t dataSize) : dataSize(dataSize) {}
        virtual GuiElementData &data() = 0;

        virtual void writeAdditionalData(std::vector<uint8_t> &data) {}

        virtual ~GuiElement() {}
    };

    struct __attribute__((packed)) ButtonElementData : public GuiElementData
    {
        uint16_t onClickThread, onPressThread, onReleaseThread;
        ButtonElementData() : GuiElementData(GuiElementType::BUTTON) {}
    };

    struct ButtonElement : public GuiElement
    {
        resourcePool::ResourceHandle<String> *text;
        ButtonElementData _data;
        ButtonElement() : GuiElement(sizeof(ButtonElementData)) {}

        ButtonElementData &data()
        {
            return _data;
        }

        ~ButtonElement()
        {
            text->decRef();
        }

        void writeAdditionalData(std::vector<uint8_t> &data) override
        {
            data.push_back(text->value->length());
            for (int i = 0; i < text->value->length(); i++)
            {
                data.push_back((*text->value)[i]);
            }
        }
    };

    std::vector<std::shared_ptr<GuiElement>> elements;
    bool elementsModified;
    time_t elementsLastSent;

    void setup()
    {
        elementsLastSent = millis() - 1000;
        elementsModified = true;

        // guiShowButton
        machine::registerFunction(
            30,
            []()
            {
                auto button = std::make_shared<ButtonElement>();
                button->text = machine::popResourceHandle<String>();
                button->data().onReleaseThread = machine::popUint16();
                button->data().onPressThread = machine::popUint16();
                button->data().onClickThread = machine::popUint16();
                button->data().rowSpan = machine::popUint8();
                button->data().colSpan = machine::popUint8();
                button->data().y = machine::popUint8();
                button->data().x = machine::popUint8();

                std::vector<std::shared_ptr<GuiElement>> newElements;

                for (auto &element : elements)
                {
                    if (!element->data().overlaps(button->data()))
                    {
                        newElements.push_back(element);
                    }
                }
                newElements.push_back(button);
                elements = newElements;
                elementsModified = true;
            });
    }

    void loop()
    {
        if (elementsModified && millis() - elementsLastSent > 100)
        {
            elementsModified = false;
            elementsLastSent = millis();

            std::vector<uint8_t> data;
            data.push_back(elements.size());
            for (auto &element : elements)
            {
                uint8_t *ptr = (uint8_t *)(&element->data());
                for (int i = 0; i < element->dataSize; i++)
                {
                    data.push_back(ptr[i]);
                }
                element->writeAdditionalData(data);
            }

            websocket::send(websocket::MessageType::UI_SNAPSHOT, data.size(), data.data());
        }
    }

    void reset()
    {
        elements.clear();
    }
}