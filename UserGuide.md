# Introduction #

The Griffin extension allows you to synchronise contacts and messages with Salesforce.

# Email #

Emails in Thunderbird can be added as tasks in Salesforce. To accomplish this, select one or more emails in the thread pane (top right) of Thunderbird and right click. From the context menu, select the "Add to Salesforce" item. Once logged-in your task will appear in salesforce immediately.

## Automatic Synchronisation ##

Adding whole classes of messages to salesforce automatically could hardly be simpler. To set up the automatic addition of messages, create a rule that copies (NOT moves) desired messages to the GriffinSynch folder. Any messages added to this folder are immediately sent to salesforce and subsequently deleted.

# Contacts #

Contacts can be synchronised on a predetermined schedule, or on demand. A synchronisation can be initiated by choosing the Tools -> Griffin -> Synchronise Now option.

To set up a scheduled synchronisation, use the options screen to configure a frequency.

The first synchronisation between salesforce and thunderbird will bring down all relevant contacts from salesforce, and this is known to take some time during which Thunderbird may become unresponsive (a later version should fix this problem). A full synchronisation can also be forced at any point using the button in the options screen.

# Configuring Field Mappings #

Field mappings are customisable to your needs. To change the field mappings for Contacts or Tasks, open the Griffin options window located at Tools -> Griffin -> Options. Choose Salesforcefields from the drop down menus to map to each Salesforcefield or the "Not Mapped" option to leave unmapped. The "Strength" column is used for matching contacts with Salesforce. When a contact is created in Salesforceit will attempt to be paired with a contact card already in Thunderbird , before a new card is created. If any card is found with an identical value in any of the strength fields, the Griffin extension will update this card, rather than creating a new card. If multiple matches are found, Griffin sums the strengths of the matched fields to calculate the strongest match.