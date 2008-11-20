@echo off
cd "C:\Documents and Settings\Compaq_Owner\My Documents\Visual Studio 2008\Projects\Thunderbird Griffin\Thunderbird Griffin"
FINDSTR "TODO" content\*.*> ToDos.txt
FINDSTR "TODO" *.rdf>> ToDos.txt
del griffin*.xpi
FOR /F "delims=<.> tokens=3,4,5" %%F IN ('FIND "<em:version>" install.rdf') DO SET GrifVer=%%F_%%G_%%H
"C:\Program Files\7-Zip\7z.exe" -tZIP u griffin.xpi install.rdf @xpiInclude.txt
COPY griffin.xpi griffin_v%GrifVer%.xpi
REN install.rdf "install UpdateUrl.rdf"
REN "install NoUpdateUrl.rdf" install.rdf
del griffin.xpi
"C:\Program Files\7-Zip\7z.exe" -tZIP u griffin.xpi install.rdf @xpiInclude.txt
COPY griffin.xpi griffin_Moz_v%GrifVer%.xpi
REN install.rdf "install NoUpdateUrl.rdf"
REN "install UpdateUrl.rdf" install.rdf