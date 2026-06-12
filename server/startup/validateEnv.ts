/** Fail fast on unsafe production configuration. */

export function validateServerEnvironment() {

  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) return;



  const v1Launch = process.env.CEREBELIX_V1_LAUNCH?.trim().toLowerCase() === "true";



  const requireEnv = (name: string, min = 1) => {

    const v = process.env[name]?.trim();

    if (!v || v.length < min) throw new Error(`${name} must be set in production.`);

    return v;

  };



  requireEnv("JWT_SECRET", 32);

  requireEnv("ADMIN_SECRET", 16);

  requireEnv("CORS_ORIGIN", 8);



  const dbUrl = process.env.DATABASE_URL?.trim();

  const sqliteBuiltin = process.env.SQLITE_DRIVER?.trim().toLowerCase() === "builtin";



  if (v1Launch) {

    if (!dbUrl?.startsWith("postgres") && !sqliteBuiltin) {

      throw new Error(

        "CEREBELIX_V1_LAUNCH: set SQLITE_DRIVER=builtin (and DATA_DIR) or DATABASE_URL=postgresql://…",

      );

    }

    const cloudDemo = process.env.CLOUD_FREE_DEMO?.trim().toLowerCase() === "true";

    const cloudActive = process.env.CLOUD_NO_TRAINING_ACTIVE?.trim().toLowerCase() === "true";

    if (!cloudDemo && !process.env.PRIVATE_CLUSTER_URL?.trim()) {

      throw new Error(

        "CEREBELIX_V1_LAUNCH: set CLOUD_FREE_DEMO=true or configure PRIVATE_CLUSTER_URL.",

      );

    }

    if (cloudDemo && !cloudActive && !process.env.PRIVATE_CLUSTER_URL?.trim()) {

      throw new Error("CEREBELIX_V1_LAUNCH: set CLOUD_NO_TRAINING_ACTIVE=true for free Cloud tier.");

    }

    return;

  }



  if (!dbUrl?.startsWith("postgres://") && !dbUrl?.startsWith("postgresql://")) {

    throw new Error("Production requires DATABASE_URL=postgresql://… (or CEREBELIX_V1_LAUNCH=true with SQLITE_DRIVER=builtin)");

  }



  requireEnv("PRIVATE_CLUSTER_URL", 8);

  requireEnv("LOCAL_CORE_URL", 8);

  requireEnv("MESH_COMPUTE_URL", 8);

}

