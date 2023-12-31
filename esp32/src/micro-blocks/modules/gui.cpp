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
        BUTTON,
        TEXT,
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

        void pushString(std::vector<uint8_t> &data, String &str)
        {
            data.push_back(str.length());
            for (int i = 0; i < str.length(); i++)
            {
                data.push_back(str[i]);
            }
        }
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
            this->pushString(data, **text);
        }
    };

    struct __attribute__((packed)) TextElementData : public GuiElementData
    {
        TextElementData() : GuiElementData(GuiElementType::TEXT) {}
    };

    struct TextElement : public GuiElement
    {
        resourcePool::ResourceHandle<String> *text;
        TextElementData _data;
        TextElement() : GuiElement(sizeof(TextElementData)) {}

        TextElementData &data()
        {
            return _data;
        }

        ~TextElement()
        {
            text->decRef();
        }

        void writeAdditionalData(std::vector<uint8_t> &data) override
        {
            this->pushString(data, **text);
        }
    };

    std::vector<std::shared_ptr<GuiElement>> elements;
    bool elementsModified;
    time_t elementsLastSent;

    void showElement(std::shared_ptr<GuiElement> newElement)
    {
        std::vector<std::shared_ptr<GuiElement>> newElements;

        for (auto &element : elements)
        {
            if (!element->data().overlaps(newElement->data()))
            {
                newElements.push_back(element);
            }
        }
        newElements.push_back(newElement);
        elements = newElements;
        elementsModified = true;
    }

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

                showElement(button);
            });

        // guiShowText
        machine::registerFunction(
            33,
            []()
            {
                auto text = std::make_shared<TextElement>();
                text->text = machine::popResourceHandle<String>();
                text->data().rowSpan = machine::popUint8();
                text->data().colSpan = machine::popUint8();
                text->data().y = machine::popUint8();
                text->data().x = machine::popUint8();

                showElement(text);
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