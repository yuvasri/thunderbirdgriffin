content\about.xul:  <!-- TODO: Get about.xul right. -->


---


content\GriffinCommon.js:        // TODO: Cache varous XPCOM classes used in GriffinCommon? Performance?

content\GriffinCommon.js:            // TODO: Login asynchronously

content\GriffinCommon.js:                        // TODO: Globalise.

content\GriffinCommon.js:                // TODO: Globalise login status messages

content\GriffinCommon.js:            // TODO: Cache connection??

content\GriffinCommon.js:                // TODO: Limit getCardForContact search so that we only get getBestMatch on relevant cards (ie ones that match on at least one field). Partially implemented, see commented out code.

content\GriffinCommon.js:            // TODO: Perhaps getBestMatch should be somewhere else? See getCardForContact

content\GriffinCommon.js:            // TODO: Perhaps getMatchStrength should be somewhere else? See getCardForContact


---


content\Log.js:        // TODO: Use nsIConsoleMessage interface of @mozilla.org/scripterror;1 for logging to error console - flexibility.

content\Log.js:        // TODO: Make persistant logging to file work!!

content\login.js:            // TODO: Globalise

content\login.xul:<!-- TODO: Beautify the login dialog -->


---


content\Message.js:    // TODO: A way of getting an nsIAbCard from a message Uri (or a list of likely ones?).


---


content\options.js:// TODO: Options screen performs login twice, (tasks and contacts)

content\options.js:// TODO:

content\options.js:                    // TODO: Password manager - do we need to remove current login for this url before adding a new one?

content\options.js:                    // TODO: Globalise

content\options.js:    // TODO: Need to get back to asynch at getFieldsDropDown, after change of api.

content\options.js:                //TODO: Find a slick way of making constant values be inserted into crm / tbird? Make use of editable menulists?? Could change to 2 drop downs instead of current static list + drop down? (nice idea :-)

content\options.js:                //TODO: Enforce one-to-one relationship for field mappings.

content\options.js:            // TODO: Globalise

content\options.js:        // TODO: Validate numeric-ness of strength fields.

content\options.js:        // TODO: Validate Id field mapped?


---


content\overlay.js:        //TODO: Hook OnItemAdded in folder listener, rather than the TotalMessages property changing. (applicable when listening to just synch folder).

content\overlay.js:                return; // TODO: This means some contact synchs will be missed. Needs to be fixed by adding a sweep to beginSynchContacts?

content\overlay.js:                        // TODO: fix up the id mapping on card creation.

content\overlay.js:        // TODO: only save if a synch property changes, not just any property?

content\overlay.js:            //TODO: Need to synch deletions between salesforce and thunderbird.

content\overlay.js:        //TODO: Listen just to the synch folder. Currently (v2.0.0.17 19-Nov-08) this crashes Thunderbird (no idea why)

content\overlay.js:    // TODO: Globalise synch messages

content\overlay.js:        // TODO: Allow synch criteria other than ownership.

content\overlay.js:        // TODO: Hardcoded directory uri, personal address book, rewite to make dynamic.

content\overlay.js:                //TODO: Should probably synch deletions here :-)

content\overlay.js:            // TODO: Fix up the time that we're setting the last synch to. Should set to the time we set in salesforce query, not time update ends.


---


content\overlay.xul:  <!-- TODO: Globalise menu labels on message window overlay. -->


---


install NoUpdateUrl.rdf:    <!-- TODO: a proper homepage -->

install NoUpdateUrl.rdf:    <!-- TODO: About page -->

install NoUpdateUrl.rdf:    <!-- TODO: Better Icon -->


---


install.rdf:    <!-- TODO: a proper homepage -->

install.rdf:    <!-- TODO: About page -->

install.rdf:    <!-- TODO: Better Icon -->

install.rdf:    <!-- TODO: Need to host this in a more stable location than my svn repo -->


---


update.rdf:    <!-- TODO: Signature required? -->