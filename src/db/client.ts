import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "@/db/schema";

const sqlite = openDatabaseSync("lembretes.db");

export const db = drizzle(sqlite, { schema });
export const sqliteClient = sqlite;
