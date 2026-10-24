import source from "../hand.json";
import { createBoneCatalog } from "../catalog";

/** hand.json stays the byte-preserved source of geometry, names and provenance. */
export const handCatalog = createBoneCatalog(source, { carpals: 8, metacarpals: 5, phalanges: 14 });
