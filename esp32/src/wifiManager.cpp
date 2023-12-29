#include "wifiManager.h"
#include <Arduino.h>
#include "ESPAsyncWebServer.h"
#include "ArduinoNvs.h"
#include "main.h"
#include <DNSServer.h>
#include "AsyncJson.h"
#include <ESPmDNS.h>
#include "webServer.h"
#include <list>

namespace wifiManager
{

    DNSServer dnsServer;

    uint32_t lastWlanChange;

    enum class WifiOperationMode
    {
        ACCESS_POINT_ONLY,
        STATION_WITH_AP_FALLBACK,
        ACCESS_POINT_AND_STATION
    };

    enum class WifiStationStatus
    {
        OFF,
        CONNECTING,
        CONNECTED,
    };

    enum class WifiApStatus
    {
        OFF,
        STARTED,
    };

    WifiStationStatus wifiStationStatus = WifiStationStatus::OFF;
    WifiApStatus wifiApStatus = WifiApStatus::OFF;

    const char *WIFI_OPERATION_MODE_KEY = "wifi_op_mode";
    WifiOperationMode wifiOperationMode = WifiOperationMode::ACCESS_POINT_ONLY;

    const char *DEVICE_NAME_KEY = "device_name";
    String deviceName = "micro-blocks";

    const char *WIFI_STA_SSID_KEY = "wifi_sta_ssid";
    String wifiStaSsid;

    const char *WIFI_STA_PWD_KEY = "wifi_sta_pwd";
    String wifiStaPwd;

    const char *WIFI_AP_SSID_KEY = "wifi_ap_ssid";
    String wifiApSsid = "micro-blocks";

    const char *WIFI_AP_PWD_KEY = "wifi_ap_pwd";
    String wifiApPwd = "micro-blocks";

    class CaptiveRequestHandler : public AsyncWebHandler
    {
    public:
        CaptiveRequestHandler() {}
        virtual ~CaptiveRequestHandler() {}

        bool canHandle(AsyncWebServerRequest *request)
        {
            auto accessPointIp = WiFi.softAPIP().toString();
            return request->host() != accessPointIp &&
                   request->host() != deviceName + ".local";
        }

        void handleRequest(AsyncWebServerRequest *request)
        {
            request->redirect("http://" + WiFi.softAPIP().toString() + "/wifiConfig");
        }
    };

    webServer::LongPollingManager statusPollingManager;

    bool wifiStationConfigAvailable()
    {
        return wifiStaSsid.length() > 0 && wifiStaPwd.length() > 0;
    }

    bool wifiApConfigAvailable()
    {
        return wifiApSsid.length() > 0 && wifiApPwd.length() > 0;
    }

    void printWifiConfig()
    {
        Serial.println("Wifi Config:");
        Serial.println("  Operation Mode: " + String((int)wifiOperationMode));
        Serial.println("  Device Name: " + deviceName);
        Serial.println("  Wifi Station SSID: " + wifiStaSsid);
        Serial.println("  Wifi Station PWD: " + wifiStaPwd);
        Serial.println("  Wifi AP SSID: " + wifiApSsid);
        Serial.println("  Wifi AP PWD: " + wifiApPwd);
        Serial.println("  Station config available: " + String(wifiStationConfigAvailable()));
        Serial.println("  AP config available: " + String(wifiApConfigAvailable()));
        Serial.println("---");
    }

    void setup()
    {
        WiFi.useStaticBuffers(true);
        WiFi.setSleep(WIFI_PS_NONE);

        wifiOperationMode = (WifiOperationMode)NVS.getInt(WIFI_OPERATION_MODE_KEY);
        NVS.getString(DEVICE_NAME_KEY, deviceName);
        NVS.getString(WIFI_STA_SSID_KEY, wifiStaSsid);
        NVS.getString(WIFI_STA_PWD_KEY, wifiStaPwd);
        NVS.getString(WIFI_AP_SSID_KEY, wifiApSsid);
        NVS.getString(WIFI_AP_PWD_KEY, wifiApPwd);

        printWifiConfig();

        webServer::server.addHandler(new CaptiveRequestHandler()).setFilter(ON_AP_FILTER); // only when requested from AP

        webServer::server.on(
            "/api/wifiStatus", HTTP_GET,
            statusPollingManager.handler(1000,
                                         [](AsyncWebServerRequest *request)
                                         {
                                             AsyncJsonResponse *response = new AsyncJsonResponse();
                                             JsonVariant &root = response->getRoot();
                                             root["version"] = statusPollingManager.version;
                                             root["stationStatus"] = (int)wifiStationStatus;
                                             root["apStatus"] = (int)wifiApStatus;
                                             response->setLength();
                                             request->send(response);
                                         }));

        webServer::server.on(
            "/api/wifiConfig", HTTP_GET,
            [](AsyncWebServerRequest *request)
            {
                AsyncJsonResponse *response = new AsyncJsonResponse();
                JsonVariant &root = response->getRoot();
                root["wifiOperationMode"] = (int)wifiOperationMode;
                root["deviceName"] = deviceName;
                root["wifiStaSsid"] = wifiStaSsid;
                root["wifiStaPwd"] = wifiStaPwd;
                root["wifiApSsid"] = wifiApSsid;
                root["wifiApPwd"] = wifiApPwd;
                response->setLength();
                request->send(response);
            });

        webServer::server.addHandler(
            new AsyncCallbackJsonWebHandler(
                "/api/wifiConfig",
                [](AsyncWebServerRequest *request, JsonVariant &json)
                {
                    Serial.println("Receiving WifiConfig...");
                    JsonObject jsonObj = json.as<JsonObject>();
                    wifiOperationMode = (WifiOperationMode)jsonObj["wifiOperationMode"].as<int>();
                    deviceName = jsonObj["deviceName"].as<String>();
                    wifiStaSsid = jsonObj["wifiStaSsid"].as<String>();
                    wifiStaPwd = jsonObj["wifiStaPwd"].as<String>();
                    wifiApSsid = jsonObj["wifiApSsid"].as<String>();
                    wifiApPwd = jsonObj["wifiApPwd"].as<String>();

                    NVS.setInt(WIFI_OPERATION_MODE_KEY, (int)wifiOperationMode, false);
                    NVS.setString(DEVICE_NAME_KEY, deviceName, false);
                    NVS.setString(WIFI_STA_SSID_KEY, wifiStaSsid, false);
                    NVS.setString(WIFI_STA_PWD_KEY, wifiStaPwd, false);
                    NVS.setString(WIFI_AP_SSID_KEY, wifiApSsid, false);
                    NVS.setString(WIFI_AP_PWD_KEY, wifiApPwd, false);
                    NVS.commit();

                    request->send(200, "text/plain", "Wifi Config updated");
                    printWifiConfig();

                    wifiApStatus = WifiApStatus::OFF;
                    wifiStationStatus = WifiStationStatus::OFF;
                    statusPollingManager.bump();
                }));
    }

    void startMdns()
    {
        Serial.println("Starting mDNS...");
        if (!MDNS.begin(deviceName.c_str()))
        {
            Serial.println("Error starting mDNS");
        }
    }

    void loop()
    {
        statusPollingManager.loop();

        // update access point
        if (!wifiApConfigAvailable() || (wifiOperationMode == WifiOperationMode::STATION_WITH_AP_FALLBACK && wifiStationStatus == WifiStationStatus::CONNECTED))
        {
            // make sure the access point is switched off
            if (wifiApStatus != WifiApStatus::OFF)
            {
                Serial.println("Stopping AP...");
                wifiApStatus = WifiApStatus::OFF;
                statusPollingManager.bump();
                WiFi.enableAP(false);
            }
        }
        else
        {
            // try to switch the access point on
            switch (wifiApStatus)
            {
            case WifiApStatus::OFF:
                Serial.println("Starting AP...");
                wifiApStatus = WifiApStatus::STARTED;
                statusPollingManager.bump();
                WiFi.softAP(wifiApSsid, wifiApPwd);
                dnsServer.start(53, "*", WiFi.softAPIP());
                startMdns();
                webServer::startWebServer();
                break;
            case WifiApStatus::STARTED:
                dnsServer.processNextRequest();
                break;
            }
        }

        // update station

        if (!wifiStationConfigAvailable || wifiOperationMode == WifiOperationMode::ACCESS_POINT_ONLY)
        {
            // make sure the station is switched off
            WiFi.enableSTA(false);
            wifiStationStatus = WifiStationStatus::OFF;
            statusPollingManager.bump();
        }
        else
        {
            // try to switch the station on
            switch (wifiStationStatus)
            {
            case WifiStationStatus::OFF:
                Serial.println("Connecting to WiFi Network '" + wifiStaSsid + "' with PWD '" + wifiStaPwd + "'");
                wifiStationStatus = WifiStationStatus::CONNECTING;
                statusPollingManager.bump();
                WiFi.begin(wifiStaSsid.c_str(), wifiStaPwd.c_str());
                break;
            case WifiStationStatus::CONNECTING:
                if (WiFi.isConnected())
                {
                    wifiStationStatus = WifiStationStatus::CONNECTED;
                    statusPollingManager.bump();
                    Serial.println("Wifi Connected. IP: " + WiFi.localIP().toString());
                    startMdns();
                    webServer::startWebServer();
                }
                break;
            case WifiStationStatus::CONNECTED:
                // NOP
                break;
            }
        }
    }
}
