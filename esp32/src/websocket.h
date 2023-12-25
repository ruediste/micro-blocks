#pragma once

#include <stdint.h>
#include <unordered_map>
#include <functional>

namespace websocket
{
    enum class MessageType : uint8_t
    {
        GRAVITY_SENSOR_VALUE,
        LOG_SNAPSHOT,
        UI_SNAPSHOT,
        BASIC_TRIGGER_CALLBACK,
    };

    struct MessageEntry
    {
        size_t dataSize;
        size_t wrappedMessageSize;
        bool dataManagedByClient;
        uint8_t *data;
    };

    extern std::unordered_map<MessageType, MessageEntry> lastMessages;
    extern std::unordered_map<MessageType, std::function<void(uint8_t *data, size_t size)>> incomingMessageHandlers;

    template <typename T>
    struct MessageWrapper
    {
        MessageType type;
        T message;

        MessageWrapper(MessageType type) : type(type)
        {
        }
    };

    /// @brief Send a message. The data is copied before sending
    void send(MessageType type, size_t messageSize,
              uint8_t *messageData);

    /// @brief Send a message which already has a MessageType. The data is not copied.
    void send(size_t wrappedMessageSize, uint8_t *wrappedMessageData);

    /// @brief Send a message without copying the data
    template <typename T>
    void send(MessageWrapper<T> &message)
    {
        send(sizeof(MessageWrapper<T>), (uint8_t *)&message);
    };

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

    inline void handle(MessageType type, std::function<void(uint8_t *data, size_t size)> handler)
    {
        incomingMessageHandlers.insert({type, handler});
    }

    void setup();
    void loop();
}