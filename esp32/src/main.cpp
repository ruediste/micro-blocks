#include <Arduino.h>

#include "FS.h"
#include "LittleFS.h"
#include <esp_spi_flash.h>
#include "ArduinoNvs.h"
#include <WiFi.h>
#include <AsyncTCP.h>
#include <md/esp_md.h>

#include "AsyncJson.h"
#include "ArduinoJson.h"
#include "serialRequest.h"
#include "wifiManager.h"
#include "webServer.h"
#include "otaUpdate.h"
#include "systemStatus.h"
#include "websocket.h"
#include "micro-blocks/micro-blocks.h"

#define LED 2
namespace main
{

  fs::LittleFSFS dataFS;

  void printDirectory(File dir, int numTabs = 3)
  {
    while (true)
    {

      File entry = dir.openNextFile();
      if (!entry)
      {
        // no more files
        break;
      }
      for (uint8_t i = 0; i < numTabs; i++)
      {
        Serial.print('\t');
      }
      Serial.print(entry.name());
      if (entry.isDirectory())
      {
        Serial.println("/");
        printDirectory(entry, numTabs + 1);
      }
      else
      {
        // files have sizes, directories do not
        Serial.print("\t\t");
        Serial.println(entry.size(), DEC);
      }
      entry.close();
    }
  }

  void printFs(fs::LittleFSFS &fs)
  {
    // Get all information of your FFat

    unsigned int totalBytes = fs.totalBytes();
    unsigned int usedBytes = fs.usedBytes();

    Serial.println("File system info.");

    Serial.print("Total space:      ");
    Serial.print(totalBytes);
    Serial.println("byte");

    Serial.print("Total space used: ");
    Serial.print(usedBytes);
    Serial.println("byte");

    Serial.println();
    Serial.println("Printing filesystem structure and sizes.");

    // Open dir folder
    File dir = fs.open("/");
    // Cycle all the content
    printDirectory(dir);
  }

  void setup()
  {
    Serial.begin(115200);
    pinMode(LED, OUTPUT);

    NVS.begin();

    Serial.println(F("Initializing Web FS..."));
    if (LittleFS.begin())
    {
      Serial.println(F("done."));
    }
    else
    {
      Serial.println(F("fail."));
    }

    printFs(LittleFS);

    Serial.println(F("Initializing Data FS..."));
    if (dataFS.begin(true, "/data", 10, "data"))
    {
      Serial.println(F("done."));
    }
    else
    {
      Serial.println(F("fail."));
    }

    printFs(dataFS);

    // start modules
    wifiManager::setup();
    // serialRequest::setup();
    otaUpdate::setup();
    systemStatus::setup();
    microBlocks::setup();
    websocket::setup();
    webServer::setup();
    Serial.println("Setup complete");
  }

  void loop()
  {
    wifiManager::loop();

    // serialRequest::loop();
    otaUpdate::loop();

    websocket::loop();

    microBlocks::loop();

    delay(1);
  }

}

void setup()
{
  main::setup();
}

void loop()
{
  main::loop();
}

extern "C"
{
  int mbedtls_md5_starts(mbedtls_md5_context *ctx)
  {
    return esp_md5_init_ret(ctx);
  }
}