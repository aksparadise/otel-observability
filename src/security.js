// src/security.js
// ─────────────────────────────────────────────────────────────────────────────
//  Security & Vulnerability Self-Check — @aksparadise/otel-observability
//
//  Provides automated vulnerability checking and dependency update suggestions.
//  Can be run as a standalone script or integrated into CI/CD pipelines.
//
//  Usage:
//    node src/security.js
//    or
//    npm run security-check
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");

/**
 * Read package.json
 */
const readPackageJson = () => {
    try {
        const content = readFileSync(packageJsonPath, "utf-8");
        return JSON.parse(content);
    } catch (err) {
        console.error("Failed to read package.json:", err.message);
        process.exit(1);
    }
};

/**
 * Run npm audit and parse results
 */
const runNpmAudit = () => {
    try {
        const output = execSync("npm audit --json", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return JSON.parse(output);
    } catch (err) {
        // npm audit exits with non-zero if vulnerabilities found
        try {
            return JSON.parse(err.stdout);
        } catch (e) {
            return { error: "Failed to parse npm audit output" };
        }
    }
};

/**
 * Check for outdated packages
 */
const checkOutdated = () => {
    try {
        const output = execSync("npm outdated --json", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return JSON.parse(output);
    } catch (err) {
        // npm outdated exits with non-zero if outdated packages found
        try {
            return JSON.parse(err.stdout);
        } catch (e) {
            return {};
        }
    }
};

/**
 * Analyze vulnerabilities and provide recommendations
 */
const analyzeVulnerabilities = (auditResult) => {
    const vulnerabilities = auditResult.vulnerabilities || {};
    const metadata = auditResult.metadata || {};
    
    const summary = {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0,
        packages: [],
    };

    Object.entries(vulnerabilities).forEach(([pkgName, data]) => {
        const severity = data.severity;
        summary.total += data.via?.length || 0;
        
        if (severity === "critical") summary.critical++;
        else if (severity === "high") summary.high++;
        else if (severity === "moderate") summary.moderate++;
        else if (severity === "low") summary.low++;
        else if (severity === "info") summary.info++;

        summary.packages.push({
            name: pkgName,
            severity,
            via: data.via?.map((v) => v.title) || [],
            patchesAvailable: data.patchedVersions?.length > 0,
            fixAvailable: data.fixAvailable,
        });
    });

    return summary;
};

/**
 * Generate update recommendations
 */
const generateRecommendations = (vulnerabilities, outdated) => {
    const recommendations = [];

    // Critical vulnerabilities - recommend immediate action
    if (vulnerabilities.critical > 0) {
        recommendations.push({
            priority: "CRITICAL",
            action: "Run 'npm audit fix' immediately to fix critical vulnerabilities",
            packages: vulnerabilities.packages
                .filter((p) => p.severity === "critical")
                .map((p) => p.name),
        });
    }

    // High vulnerabilities
    if (vulnerabilities.high > 0) {
        recommendations.push({
            priority: "HIGH",
            action: "Run 'npm audit fix' to fix high-severity vulnerabilities",
            packages: vulnerabilities.packages
                .filter((p) => p.severity === "high")
                .map((p) => p.name),
        });
    }

    // Outdated packages
    const outdatedPackages = Object.keys(outdated);
    if (outdatedPackages.length > 0) {
        recommendations.push({
            priority: "MEDIUM",
            action: "Consider updating outdated packages with 'npm update'",
            packages: outdatedPackages.slice(0, 10), // Limit to first 10
        });
    }

    // General recommendation
    if (vulnerabilities.total === 0 && outdatedPackages.length === 0) {
        recommendations.push({
            priority: "INFO",
            action: "No vulnerabilities or outdated packages found. System is secure!",
            packages: [],
        });
    }

    return recommendations;
};

/**
 * Print security report
 */
const printReport = (vulnerabilities, outdated, recommendations) => {
    console.log("\n" + "=".repeat(80));
    console.log("SECURITY & VULNERABILITY REPORT");
    console.log("=".repeat(80) + "\n");

    // Vulnerability Summary
    console.log("📊 VULNERABILITY SUMMARY");
    console.log("-".repeat(80));
    console.log(`Total Vulnerabilities: ${vulnerabilities.total}`);
    console.log(`  Critical: ${vulnerabilities.critical}`);
    console.log(`  High: ${vulnerabilities.high}`);
    console.log(`  Moderate: ${vulnerabilities.moderate}`);
    console.log(`  Low: ${vulnerabilities.low}`);
    console.log(`  Info: ${vulnerabilities.info}`);

    // Affected Packages
    if (vulnerabilities.packages.length > 0) {
        console.log("\n📦 AFFECTED PACKAGES");
        console.log("-".repeat(80));
        vulnerabilities.packages.forEach((pkg) => {
            const icon = pkg.severity === "critical" ? "🔴" : 
                        pkg.severity === "high" ? "🟠" : 
                        pkg.severity === "moderate" ? "🟡" : "🟢";
            console.log(`${icon} ${pkg.name} (${pkg.severity})`);
            if (pkg.via.length > 0) {
                pkg.via.forEach((via) => {
                    console.log(`   - ${via}`);
                });
            }
        });
    }

    // Outdated Packages
    const outdatedPackages = Object.keys(outdated);
    if (outdatedPackages.length > 0) {
        console.log("\n📦 OUTDATED PACKAGES");
        console.log("-".repeat(80));
        outdatedPackages.slice(0, 10).forEach((pkg) => {
            const info = outdated[pkg];
            console.log(`⚠️  ${pkg}`);
            console.log(`   Current: ${info.current}`);
            console.log(`   Latest: ${info.latest}`);
        });
        if (outdatedPackages.length > 10) {
            console.log(`   ... and ${outdatedPackages.length - 10} more`);
        }
    }

    // Recommendations
    console.log("\n💡 RECOMMENDATIONS");
    console.log("-".repeat(80));
    recommendations.forEach((rec) => {
        const icon = rec.priority === "CRITICAL" ? "🔴" : 
                    rec.priority === "HIGH" ? "🟠" : 
                    rec.priority === "MEDIUM" ? "🟡" : "🟢";
        console.log(`${icon} [${rec.priority}] ${rec.action}`);
        if (rec.packages.length > 0) {
            console.log(`   Packages: ${rec.packages.join(", ")}`);
        }
    });

    console.log("\n" + "=".repeat(80));
    console.log("END OF REPORT");
    console.log("=".repeat(80) + "\n");
};

/**
 * Main security check function
 */
const runSecurityCheck = () => {
    console.log("🔒 Running security check...\n");

    const packageJson = readPackageJson();
    console.log(`📦 Checking package: ${packageJson.name} v${packageJson.version}\n`);

    // Run npm audit
    console.log("Running npm audit...");
    const auditResult = runNpmAudit();

    // Check outdated packages
    console.log("Checking for outdated packages...");
    const outdated = checkOutdated();

    // Analyze results
    const vulnerabilities = analyzeVulnerabilities(auditResult);
    const recommendations = generateRecommendations(vulnerabilities, outdated);

    // Print report
    printReport(vulnerabilities, outdated, recommendations);

    // Exit with appropriate code
    if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
        console.log("⚠️  Critical or high-severity vulnerabilities found. Please fix them.");
        process.exit(1);
    } else if (vulnerabilities.total > 0) {
        console.log("⚠️  Vulnerabilities found. Consider fixing them.");
        process.exit(0);
    } else {
        console.log("✅ No vulnerabilities found!");
        process.exit(0);
    }
};

/**
 * Auto-update safe packages (non-breaking updates)
 */
const autoUpdateSafePackages = () => {
    console.log("🔄 Running safe package updates...\n");

    try {
        // Run npm audit fix (safe updates only)
        console.log("Running 'npm audit fix'...");
        execSync("npm audit fix", { stdio: "inherit" });

        console.log("\n✅ Safe updates completed successfully!");
        console.log("Run 'npm run security-check' again to verify.");
    } catch (err) {
        console.error("\n❌ Auto-update failed:", err.message);
        console.log("You may need to manually update packages.");
        process.exit(1);
    }
};

// Run security check if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2];

    if (command === "--auto-fix") {
        autoUpdateSafePackages();
    } else {
        runSecurityCheck();
    }
}

export { runSecurityCheck, autoUpdateSafePackages };
export default { runSecurityCheck, autoUpdateSafePackages };
