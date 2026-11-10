// The resume is served from public/ at a fixed address rather than imported, which would give it
// a new hashed name with every build. Some browsers ignore a link's download name, like Safari on
// iPhone, or a PDF opened in a tab and saved from there, and use the name in the address instead.
export const RESUME_URL = "/RogerTruongResume.pdf";
export const RESUME_NAME = "RogerTruongResume.pdf";
