#include "rgbLed.h"
#include <NeoPixelBus.h>
#include <NeoPixelAnimator.h>
#include <SPI.h>
#include <SD.h>
#include <unordered_map>
#include "colour.h"
#include "../machine.h"

namespace rgbLedModule
{
    typedef NeoPixelBus<NeoGrbFeature, NeoWs2812xMethod> MyNeoPixelBus;

    struct BusEntry
    {
        MyNeoPixelBus bus;
        uint16_t width;
        uint16_t height;

        BusEntry(uint16_t width, uint16_t height, uint8_t pin)
            : bus(width * height, pin), width(width), height(height)
        {
        }
    };

    struct M3
    {
        float v[3][3];
    };
    struct V3
    {
        float v[3];
    };

    M3 m3Mul(M3 a, M3 b)
    {
        M3 result;
        for (int i = 0; i < 3; i++)
            for (int j = 0; j < 3; j++)
            {
                result.v[i][j] = 0;
                for (int k = 0; k < 3; k++)
                    result.v[i][j] += a.v[i][k] * b.v[k][j];
            }
        return result;
    }

    M3 m3Translate(float x, float y)
    {
        M3 result;
        result.v[0][0] = 1;
        result.v[0][1] = 0;
        result.v[0][2] = x;
        result.v[1][0] = 0;
        result.v[1][1] = 1;
        result.v[1][2] = y;
        result.v[2][0] = 0;
        result.v[2][1] = 0;
        result.v[2][2] = 1;
        return result;
    }

    M3 m3scaleRotate(float scale, float rotate)
    {
        M3 result;
        result.v[0][0] = scale * cos(rotate);
        result.v[0][1] = scale * sin(rotate);
        result.v[0][2] = 0;
        result.v[1][0] = -scale * sin(rotate);
        result.v[1][1] = scale * cos(rotate);
        result.v[1][2] = 0;
        result.v[2][0] = 0;
        result.v[2][1] = 0;
        result.v[2][2] = 1;
        return result;
    }

    V3 m3Vec(float x, float y)
    {
        V3 result;
        result.v[0] = x;
        result.v[1] = y;
        result.v[2] = 1;
        return result;
    }

    V3 m3Mul(M3 m, V3 v)
    {
        V3 result;
        for (int i = 0; i < 3; i++)
        {
            result.v[i] = 0;
            for (int k = 0; k < 3; k++)
                result.v[i] += m.v[i][k] * v.v[k];
        }
        return result;
    }

    // Indices: 0 = g; 1= r; 2 = b
    std::unordered_map<uint16_t, BusEntry *> busses;

    struct Bitmap
    {
        uint16_t width;
        uint16_t height;
        uint8_t data[];

        bool get(int x, int y)
        {
            if (x < 0 || x >= width || y < 0 || y >= height)
            {
                return false;
            }
            return data[y * width + x] != 0;
        }
    };

    void setup()
    {
        //  rgbLedSetup
        machine::registerFunction(
            48,
            []()
            {
                auto height = machine::popUint16();
                auto width = machine::popUint16();
                auto pin = machine::popUint8();
                auto id = machine::popUint16();

                auto entry = new BusEntry(width, height, pin);
                entry->bus.Begin();
                busses[id] = entry;
            });

        // rgbLedSetColour
        machine::registerFunction(
            49,
            []()
            {
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();
                auto index = machine::popFloat();
                auto id = machine::popUint16();

                busses[id]->bus.SetPixelColor(index, RgbColor(colourModule::deGamma(r) * 255, colourModule::deGamma(g) * 255, colourModule::deGamma(b) * 255));
            });

        // rgbShow
        machine::registerFunction(
            50,
            []()
            {
                auto id = machine::popUint16();
                busses[id]->bus.Show();
            });

        // rgbSetBitmap
        machine::registerFunction(
            51,
            []()
            {
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();

                auto transparent = machine::popUint8() != 0;
                auto rotation = machine::popFloat();
                auto scale = machine::popFloat();
                auto bitmapY = machine::popFloat();
                auto bitmapX = machine::popFloat();
                auto ledHeight = (int)machine::popFloat();
                auto ledWidth = (int)machine::popFloat();
                auto ledY = (int)machine::popFloat();
                auto ledX = (int)machine::popFloat();
                auto bitmapOffset = machine::popUint16();
                auto id = machine::popUint16();

                auto entry = busses[id];
                auto bitmap = (Bitmap *)machine::constantPool(bitmapOffset);

                // auto color = RgbColor(colourModule::deGamma(r) * 255, colourModule::deGamma(g) * 255, colourModule::deGamma(b) * 255);

                // build the projection matrix
                M3 projection = m3Translate(-ledWidth / 2, -ledHeight / 2);
                projection = m3Mul(m3scaleRotate(1 / scale, rotation), projection);
                projection = m3Mul(m3Translate(bitmapX + ledWidth / 2, bitmapY + ledHeight / 2), projection);

                // Serial.println(String("bitmapWidth: ") + bitmapWidth +
                //                " bitmapHeight: " + bitmapHeight + " ledWidth: " + ledWidth + " ledHeight: " + ledHeight + " ledX: " + ledX + " ledY: " + ledY + " bitmapX: " + bitmapX + " bitmapY: " + bitmapY + " scale: " + scale + " rotation: " + rotation + " transparent: " + transparent + " entryWidth: " + entry->width + " entryHeight: " + entry->height);
                // Serial.println(String("projection: ") + projection.v[0][0] + "," + projection.v[0][1] + "," + projection.v[0][2]);
                // Serial.println(String("projection: ") + projection.v[1][0] + "," + projection.v[1][1] + "," + projection.v[1][2]);
                // Serial.println(String("projection: ") + projection.v[2][0] + "," + projection.v[2][1] + "," + projection.v[2][2]);
                // set the pixels
                for (int y = 0; y < min(ledHeight, entry->height - ledY); y++)
                {
                    for (int x = 0; x < min(ledWidth, entry->width - ledX); x++)
                    {
                        V3 v = m3Mul(projection, m3Vec(x, y));

                        int pixelIndex = ledX + x + (ledY + y) * entry->width;

                        auto bx = (v.v[0]);
                        auto by = (v.v[1]);
                        // Serial.println(String("x: ") + x + " y: " + y + " bx: " + bx + " by: " + by + " pixelIndex: " + pixelIndex);

                        auto v00 = bitmap->get(bx, by);
                        auto v01 = bitmap->get(bx, by + 1);
                        auto v10 = bitmap->get(bx + 1, by);
                        auto v11 = bitmap->get(bx + 1, by + 1);

                        // bilinear interpolation
                        auto v0 = v00 * (1 - (bx - floor(bx))) + v10 * (bx - floor(bx));
                        auto v1 = v01 * (1 - (bx - floor(bx))) + v11 * (bx - floor(bx));
                        auto value = v0 * (1 - (by - floor(by))) + v1 * (by - floor(by));

                        if (value > 0)
                            entry->bus.SetPixelColor(pixelIndex, RgbColor(colourModule::deGamma(r * value) * 255, colourModule::deGamma(g * value) * 255, colourModule::deGamma(b * value) * 255));
                        else if (!transparent)
                        {
                            entry->bus.SetPixelColor(pixelIndex, RgbColor(0, 0, 0));
                        }
                    }
                }
            });
    }
    void loop() {}

    void reset()
    {
        for (auto &bus : busses)
        {
            delete bus.second;
        }
        busses.clear();
    }
}