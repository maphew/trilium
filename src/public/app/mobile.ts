import appContext from "./components/app_context.js";
import noteAutocompleteService from "./services/note_autocomplete.js";
import glob from "./services/glob.js";
import "../stylesheets/bootstrap.scss";

glob.setupGlobs();

await appContext.earlyInit();

noteAutocompleteService.init();

// A dynamic import is required for layouts since they initialize components which require translations.
const MobileLayout = (await import("./layouts/mobile_layout.js")).default;

appContext.setLayout(new MobileLayout());
appContext.start();
