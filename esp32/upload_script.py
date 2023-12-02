Import("env")
env.Replace(UPLOADCMD="curl -v -H \"Content-Type: application/octet-stream\" --data-binary @$SOURCE $UPLOAD_PORT")