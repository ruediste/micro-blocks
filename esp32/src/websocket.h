#pragma once

#include <stdint.h>
#include <unordered_map>
#include <functional>

namespace websocket
{
    enum class MessageType : uint8_t
    {
        OVEN_STATUS,
        OVEN_UPDATE
    };

    struct MessageEntry
    {
        size_t size;
        uint8_t *data;
    };

    extern std::unordered_map<MessageType, MessageEntry> lastMessages;
    extern std::unordered_map<MessageType, std::function<void(uint8_t *data, size_t size)>> incomingMessageHandlers;

    template <typename T>
    struct MessageWrapper
    {
        MessageType type;
        T message;
    };

    void send(MessageType type, size_t messageSize,
              uint8_t *messageData);

    /// @brief Send the message. The data is copied to a buffer
    template <typename T>
    void send(MessageType type, T &message)
    {
        send(type, sizeof(T), (uint8_t *)&message);
    }

    template <typename T>
    void handle(MessageType type, std::function<void(T &message)> handler)
    {
        incomingMessageHandlers.insert({type, [handler](uint8_t *data, size_t size)
                                        {
                                            handler(*((T *)data));
                                        }});
    }

    void setup();
    void loop();
}