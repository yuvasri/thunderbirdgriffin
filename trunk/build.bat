@echo on
SETLOCAL ENABLEEXTENSIONS
SETLOCAL ENABLEDELAYEDEXPANSION

:: Generate a TODO: list
cd "C:\Documents and Settings\Compaq_Owner\My Documents\Visual Studio 2008\Projects\Thunderbird Griffin\Thunderbird Griffin"
echo #Intro > ToDos.txt
FOR /F "usebackq tokens=1,4* delims=:-" %%F IN (`FINDSTR "TODO" content\*.xul`) DO (
IF NOT [!PrevFile!]==[%%F] ECHO ---->> ToDos.txt
ECHO %%F %%G>> ToDos.txt
ECHO.>> ToDos.txt
SET PrevFile=%%F
)
FOR /F "usebackq tokens=1,3* delims=:-" %%F IN (`FINDSTR "TODO" content\*.js`) DO (
IF NOT [!PrevFile!]==[%%F] ECHO ---->> ToDos.txt
ECHO %%F %%G>> ToDos.txt
ECHO.>> ToDos.txt
SET PrevFile=%%F
)
FOR /F "usebackq tokens=1,4* delims=:-" %%F IN (`FINDSTR "TODO" *.rdf`) DO (
IF NOT [!PrevFile!]==[%%F] ECHO ---->> ToDos.txt
ECHO %%F %%G>> ToDos.txt
ECHO.>> ToDos.txt
SET PrevFile=%%F
)

:: Build xpi installers
del griffin*.xpi
FOR /F "delims=<.> tokens=3,4,5" %%F IN ('FIND "<em:version>" install.rdf') DO SET GrifVer=%%F_%%G_%%H
"C:\Program Files\7Zip\7z.exe" -tZIP u griffin.xpi install.rdf @xpiInclude.txt
COPY griffin.xpi griffin_v%GrifVer%.xpi
REN install.rdf "install UpdateUrl.rdf"
REN "install NoUpdateUrl.rdf" install.rdf
del griffin.xpi	
"C:\Program Files\7Zip\7z.exe" -tZIP u griffin.xpi install.rdf @xpiInclude.txt
COPY griffin.xpi griffin_Moz_v%GrifVer%.xpi
REN install.rdf "install NoUpdateUrl.rdf"
REN "install UpdateUrl.rdf" install.rdf
	