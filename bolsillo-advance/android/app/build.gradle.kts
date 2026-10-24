import groovy.json.JsonSlurper

plugins {
    id("com.android.application")
}

// version and web payload come from the shared tree: bolsillo-advance/version.json and app/gba (node build.js)
val project_root = rootDir.resolve("..")
@Suppress("UNCHECKED_CAST")
val version = JsonSlurper().parse(project_root.resolve("version.json")) as Map<String, Any>
val webDist = project_root.resolve("app/gba/dist/www")

// Upload key for Play (never in the repository): BOLSILLO_KEYSTORE, BOLSILLO_KEYSTORE_PASSWORD,
// BOLSILLO_KEY_ALIAS, BOLSILLO_KEY_PASSWORD. Without them the release build is left unsigned.
val keystore = System.getenv("BOLSILLO_KEYSTORE")?.let { file(it) }

android {
    namespace = "com.bolsillo.advance"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.bolsillo.advance"
        minSdk = 24
        targetSdk = 36
        versionCode = (version["code"] as Number).toInt()
        versionName = version["name"] as String
    }

    signingConfigs {
        if (keystore != null) {
            create("upload") {
                storeFile = keystore
                storePassword = System.getenv("BOLSILLO_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("BOLSILLO_KEY_ALIAS")
                keyPassword = System.getenv("BOLSILLO_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystore != null) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/web"))

    bundle {
        language { enableSplit = false }
    }
}

// Runs the web build (node app/gba/build.js) and copies dist/www into the assets as www/.
val buildWeb by tasks.registering(Exec::class) {
    workingDir = project_root.resolve("app/gba")
    commandLine("node", "build.js")
    inputs.dir(project_root.resolve("app/gba/src"))
    inputs.dir(project_root.resolve("app/gba/ui"))
    inputs.dir(project_root.resolve("notices"))
    inputs.file(project_root.resolve("version.json"))
    outputs.dir(webDist)
    outputs.upToDateWhen { false } // the notices carry the current git commit
}
val syncWeb by tasks.registering(Sync::class) {
    dependsOn(buildWeb)
    from(webDist)
    into(layout.buildDirectory.dir("generated/web/www"))
}
tasks.named("preBuild") { dependsOn(syncWeb) }
