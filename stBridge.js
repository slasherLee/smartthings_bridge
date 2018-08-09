
//##### Options for this program ###################################
var logFile = "no"    //    Set to no to disable error.log file.
var hubPort = 8083    //    Synched with Device Handlers.
//##################################################################

//---- Determine if old Node version, act accordingly -------------
console.log("Node.js Version Detected:   " + process.version)
var oldNode = "no"
if (process.version == "v6.0.0-pre") {
    oldNode ="yes"
    logFile = "no"
}

//---- Program set up and global variables -------------------------
var http = require('http')
var net = require('net')
var fs = require('fs')
const TuyaDevice = require('tuyapi')
const BroadlinkDevice = require('broadlink-js-smth')

var server = http.createServer(onRequest)

//---- Start the HTTP Server Listening to SmartThings --------------
server.listen(hubPort)
console.log("smartthings bridge Console Log")
logResponse("\n\r" + new Date() + "\rsmarrhings bridge Error Log")

//---- Command interface to Smart Things ---------------------------
function onRequest(request, response){
    var device_type = request.headers["type"]
    
    var cmdRcvd = "\n\r" + new Date() + "\r\nsent type " + device_type
    console.log(" ")
    console.log(cmdRcvd)
        
    switch(device_type) {

        //---- Tuya Device ---------------------------
        case "tuya":
            processTuyaCommand(request, response)
            break

        //---- Broadlink Device ---------------------------
        case "broadlink":
            processBroadlinkCommand(request, response)
            break
    
        default:
            response.setHeader("cmd-response", "InvalidHubCmd")
            response.end()
            var respMsg = "#### Invalid Command ####"
            var respMsg = new Date() + "\n\r#### Invalid Device Name :" + device_type + " ####\n\r"
            console.log(respMsg)
            logResponse(respMsg)
    }
}

//---- Send deviceCommand and send response to SmartThings ---------
function processTuyaCommand(request, response) {
    
    var deviceIP = request.headers["tuyapi-ip"]
    var deviceID = request.headers["tuyapi-devid"]
    var localKey = request.headers["tuyapi-localkey"]
    var command =  request.headers["tuyapi-command"]
    var dps = request.headers["dps"]

    var respMsg = "deviceCommand sending to IP: " + deviceIP + " Command: " + command
    console.log(respMsg)

    var tuya = new TuyaDevice({
        id: deviceID,
        key: localKey,
        dps: dps,
        ip: deviceIP});

    switch(command) {
        case "off":
            tuya.get({'dps': dps}).then(status => {
                console.log('Status: ' + status);

                tuya.set({set: false, 'dps': dps}).then(result => {
                    console.log('Result of setting status to ' + false + ': ' + result);
                    response.setHeader("cmd-response", status );
                    response.setHeader("onoff", "off");
                    console.log("Status (" + status + ") sent to SmartThings.");
                    response.end();
                });
            });
            break;

        case "on":
            tuya.get({'dps': dps}).then(status => {
                console.log('Status: ' + status);

                tuya.set({set: true, 'dps': dps}).then(result => {
                    console.log('Result of setting status to ' + true + ': ' + result);
                    response.setHeader("cmd-response", !status );
                    response.setHeader("onoff", "on");
                    console.log("Status (" + !status + ") sent to SmartThings.");
                    response.end();
                });
             });
             break;

        case "status":
            tuya.get({'dps': dps}).then(status => {
                console.log('Status: ' + status);
                var strStatus = "off";
                if( status )
                    strStatus = "on"
                response.setHeader("cmd-response", strStatus );
                console.log("Status (" + status + ") sent to SmartThings.");
                response.end();
            });
            break;

        default:
            console.log('Unknown request');
            break;
    
    }      
}

//---- Send deviceCommand and send response to SmartThings ---------
function processBroadlinkCommand(request, response) {
    
    var deviceIP = request.headers["devip"]
    var command =  request.headers["command"]
    var dps = request.headers["dps"]

    var respMsg = "deviceCommand sending to IP: " + deviceIP + " Command: " + command;
    console.log(respMsg);

    var broadlink = new BroadlinkDevice();
    broadlink.discover(null, [deviceIP]);

    broadlink.on("deviceReady", function(dev) {
        console.log("typeof mac >>> "+dev.mac);
        console.log(">>>>>>>>>>>>>>>find dev ip=" + dev.host.address +" type="+dev.type);

        dev.on("power", function(status) {
            console.log("receive check_power : " + status);
            response.setHeader("cmd-response", status);
            response.end();
        });

        dev.on("done", function() {
            console.log("receive set_power");
            this.check_power();
        });

        switch(command) {
            case "on":
                dev.set_power(true);
                break;

            case "off":
                dev.set_power(false);
                break;

            case "status":
                dev.check_power();
                break;

            default:
                console.log('Unknown request');
                break;
        }
        //broadlink.discover(null,[]);
    });
}

//----- Utility - Response Logging Function ------------------------
function logResponse(respMsg) {
    if (logFile == "yes") {
        fs.appendFileSync("error.log", "\r" + respMsg)
    }
}
