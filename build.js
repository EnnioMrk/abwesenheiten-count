#!/usr/bin/env bun

/**
 * Build script for abwesenheiten-count project using Bun
 * Builds both server-side and client-side assets
 */

import { rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { glob } from 'glob';

// Configuration
const config = {
    server: {
        entrypoints: ['./server.js'],
        outdir: './build/server',
        target: 'bun',
        format: 'esm',
        minify: process.env.NODE_ENV === 'production',
        splitting: false,
        packages: 'bundle', // Bundle all dependencies for server
        external: [
            // External dependencies that should not be bundled
            'pg-native', // PostgreSQL native bindings
        ],
    },
    client: {
        entrypoints: [
            // Main client scripts
            './public/js/index.js',
            './public/js/styler.js',
            './public/js/animations.js',
            
            // Dashboard scripts
            './public/dashboard/js/index.js',
            './public/dashboard/js/analyze.js',
            './public/dashboard/js/editor.js',
            './public/dashboard/js/grid.js',
            './public/dashboard/js/chart.js',
            
            // Page-specific scripts
            './public/recommender/js/index.js',
            './public/profile/js/index.js',
            './public/roulette/js/index.js',
            './public/register/js/registration.js',
            './public/register/js/password-validator.js',
            './public/untis-login/js/index.js',
        ],
        outdir: './build/public',
        target: 'browser',
        format: 'esm',
        minify: process.env.NODE_ENV === 'production',
        splitting: true, // Enable code splitting for client
        packages: 'external', // Keep client dependencies external
        publicPath: '/js/',
        sourcemap: process.env.NODE_ENV === 'development' ? 'linked' : 'none',
        naming: {
            entry: '[dir]/[name].[ext]',
            chunk: 'chunks/[name]-[hash].[ext]',
            asset: 'assets/[name]-[hash].[ext]',
        },
    },
};

// Build modes
const MODES = {
    server: 'server',
    client: 'client',
    html: 'html',
    all: 'all',
    clean: 'clean',
};

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📦',
        success: '✅',
        error: '❌',
        warn: '⚠️',
        clean: '🧹',
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function cleanBuildDir() {
    log('Cleaning build directory...', 'clean');
    if (existsSync('./build')) {
        rmSync('./build', { recursive: true, force: true });
        log('Build directory cleaned', 'success');
    }
}

async function buildServer() {
    log('Building server...');
    
    try {
        const result = await Bun.build({
            ...config.server,
            env: process.env.NODE_ENV === 'production' ? 'inline' : 'disable',
            define: {
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
            },
            banner: '#!/usr/bin/env bun\n// Built with Bun at ' + new Date().toISOString(),
        });

        if (!result.success) {
            throw new AggregateError(result.logs, 'Server build failed');
        }

        const totalSize = result.outputs.reduce((acc, output) => acc + output.size, 0);
        log(`Server built successfully! ${result.outputs.length} files, ${formatBytes(totalSize)}`, 'success');
        
        // Log each output file
        result.outputs.forEach(output => {
            log(`  ${output.path} (${formatBytes(output.size)})`);
        });

        return result;
    } catch (error) {
        log(`Server build failed: ${error.message}`, 'error');
        if (error.errors) {
            error.errors.forEach(err => log(`  ${err.message}`, 'error'));
        }
        throw error;
    }
}

async function buildClient() {
    log('Building client assets...');
    
    try {
        const result = await Bun.build({
            ...config.client,
            env: 'disable', // Don't inline server env vars in client
            define: {
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
            },
            banner: '// Built with Bun at ' + new Date().toISOString(),
        });

        if (!result.success) {
            throw new AggregateError(result.logs, 'Client build failed');
        }

        const totalSize = result.outputs.reduce((acc, output) => acc + output.size, 0);
        log(`Client built successfully! ${result.outputs.length} files, ${formatBytes(totalSize)}`, 'success');
        
        // Group outputs by type for better logging
        const grouped = result.outputs.reduce((acc, output) => {
            acc[output.kind] = acc[output.kind] || [];
            acc[output.kind].push(output);
            return acc;
        }, {});

        Object.entries(grouped).forEach(([kind, outputs]) => {
            log(`  ${kind}: ${outputs.length} files`);
            outputs.forEach(output => {
                const relativePath = output.path.replace(process.cwd() + '/build/public/', '');
                log(`    ${relativePath} (${formatBytes(output.size)})`);
            });
        });

        if (result.logs.length > 0) {
            log('Build warnings:', 'warn');
            result.logs.forEach(msg => log(`  ${msg.message}`, 'warn'));
        }

        return result;
    } catch (error) {
        log(`Client build failed: ${error.message}`, 'error');
        if (error.errors) {
            error.errors.forEach(err => log(`  ${err.message}`, 'error'));
        }
        throw error;
    }
}

async function buildAll() {
    const startTime = Date.now();
    log('Starting full build...');
    
    try {
        // Build server, client, and HTML in parallel
        const [serverResult, clientResult, htmlResult] = await Promise.all([
            buildServer(),
            buildClient(),
            bundleHTML(),
        ]);

        const duration = Date.now() - startTime;
        const totalFiles = serverResult.outputs.length + clientResult.outputs.length + htmlResult.length;
        const totalSize = [...serverResult.outputs, ...clientResult.outputs]
            .reduce((acc, output) => acc + output.size, 0) + 
            htmlResult.reduce((acc, result) => acc + result.size, 0);

        log(`Full build completed in ${duration}ms! ${totalFiles} files, ${formatBytes(totalSize)}`, 'success');
        return { server: serverResult, client: clientResult, html: htmlResult };
    } catch (error) {
        log(`Build failed: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Watch mode
async function watch() {
    log('Starting watch mode...');
    
    // Initial build
    await buildAll();
    
    // Watch for changes (basic implementation)
    const chokidar = await import('chokidar');
    const watcher = chokidar.watch([
        './server.js',
        './helpers/**/*.js',
        './managers/**/*.js',
        './api/**/*.js',
        './widgets/**/*.js',
        './public/**/*.js',
    ], {
        ignored: /node_modules|build/,
        persistent: true,
    });

    let rebuilding = false;
    const rebuild = async () => {
        if (rebuilding) return;
        rebuilding = true;
        
        try {
            log('Files changed, rebuilding...');
            await buildAll();
        } catch (error) {
            log(`Rebuild failed: ${error.message}`, 'error');
        } finally {
            rebuilding = false;
        }
    };

    watcher.on('change', rebuild);
    watcher.on('add', rebuild);
    watcher.on('unlink', rebuild);

    log('Watching for changes... Press Ctrl+C to stop');
}

// HTML bundling functions
async function bundleHTML() {
    log('Building HTML bundles...');
    
    try {
        // Define HTML files to bundle with their JS dependencies
        const htmlConfigs = [
            {
                input: './public/dashboard/index.html',
                output: './build/html/dashboard.html',
                jsFiles: [
                    './public/dashboard/js/index.js',
                    './public/dashboard/js/analyze.js',
                    './public/dashboard/js/chart.js',
                    './public/dashboard/js/grid.js',
                ],
                cssFiles: [],
            },
            {
                input: './public/recommender/index.html',
                output: './build/html/recommender.html',
                jsFiles: [
                    './public/recommender/js/index.js',
                ],
                cssFiles: [
                    './public/recommender/css/style.css',
                ],
            },
            {
                input: './public/profile/index.html',
                output: './build/html/profile.html',
                jsFiles: [
                    './public/profile/js/index.js',
                ],
                cssFiles: [],
            },
            {
                input: './public/roulette/index.html',
                output: './build/html/roulette.html',
                jsFiles: [
                    './public/roulette/js/index.js',
                ],
                cssFiles: [
                    './public/roulette/css/style.css',
                ],
            },
            {
                input: './public/register/index.html',
                output: './build/html/register.html',
                jsFiles: [
                    './public/register/js/registration.js',
                    './public/register/js/password-validator.js',
                ],
                cssFiles: [],
            },
            {
                input: './public/untis-login/index.html',
                output: './build/html/untis-login.html',
                jsFiles: [
                    './public/untis-login/js/index.js',
                ],
                cssFiles: [
                    './public/untis-login/css/style.css',
                ],
            },
        ];

        const results = [];
        
        for (const config of htmlConfigs) {
            const result = await bundleHTMLFile(config);
            results.push(result);
        }

        const totalSize = results.reduce((acc, result) => acc + result.size, 0);
        log(`HTML bundling completed! ${results.length} files, ${formatBytes(totalSize)}`, 'success');
        
        results.forEach(result => {
            log(`  ${result.outputPath} (${formatBytes(result.size)})`);
        });

        return results;
    } catch (error) {
        log(`HTML bundling failed: ${error.message}`, 'error');
        throw error;
    }
}

async function bundleHTMLFile(config) {
    const { input, output, jsFiles, cssFiles } = config;
    
    // Read the original HTML file
    let html = readFileSync(input, 'utf-8');
    
    // Bundle JavaScript files
    const bundledJS = [];
    for (const jsFile of jsFiles) {
        if (existsSync(jsFile)) {
            try {
                // Build the JS file using Bun
                const buildResult = await Bun.build({
                    entrypoints: [jsFile],
                    target: 'browser',
                    format: 'iife', // Immediately Invoked Function Expression for inline scripts
                    minify: process.env.NODE_ENV === 'production',
                    define: {
                        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                    },
                });

                if (buildResult.success && buildResult.outputs.length > 0) {
                    const jsContent = await buildResult.outputs[0].text();
                    bundledJS.push(`/* Bundled from ${relative(process.cwd(), jsFile)} */\n${jsContent}`);
                } else {
                    log(`Warning: Failed to build ${jsFile}`, 'warn');
                    // Fallback: read the file directly
                    const jsContent = readFileSync(jsFile, 'utf-8');
                    bundledJS.push(`/* Direct from ${relative(process.cwd(), jsFile)} */\n${jsContent}`);
                }
            } catch (error) {
                log(`Warning: Error processing ${jsFile}: ${error.message}`, 'warn');
                // Fallback: read the file directly
                const jsContent = readFileSync(jsFile, 'utf-8');
                bundledJS.push(`/* Direct from ${relative(process.cwd(), jsFile)} */\n${jsContent}`);
            }
        } else {
            log(`Warning: JS file not found: ${jsFile}`, 'warn');
        }
    }
    
    // Bundle CSS files
    const bundledCSS = [];
    for (const cssFile of cssFiles) {
        if (existsSync(cssFile)) {
            const cssContent = readFileSync(cssFile, 'utf-8');
            bundledCSS.push(`/* Bundled from ${relative(process.cwd(), cssFile)} */\n${cssContent}`);
        } else {
            log(`Warning: CSS file not found: ${cssFile}`, 'warn');
        }
    }
    
    // Create the bundled HTML
    let bundledHTML = html;
    
    // Remove existing script tags that reference the JS files we're bundling
    for (const jsFile of jsFiles) {
        const fileName = jsFile.split('/').pop();
        const scriptTagRegex = new RegExp(`<script[^>]*src=[^>]*${fileName.replace('.', '\\.')}[^>]*><\\/script>\\s*`, 'gi');
        bundledHTML = bundledHTML.replace(scriptTagRegex, '');
    }
    
    // Remove existing link tags that reference the CSS files we're bundling
    for (const cssFile of cssFiles) {
        const fileName = cssFile.split('/').pop();
        const linkTagRegex = new RegExp(`<link[^>]*href=[^>]*${fileName.replace('.', '\\.')}[^>]*>\\s*`, 'gi');
        bundledHTML = bundledHTML.replace(linkTagRegex, '');
    }
    
    // Add bundled CSS to the head
    if (bundledCSS.length > 0) {
        const cssBundle = `\n<style>\n${bundledCSS.join('\n\n')}\n</style>`;
        bundledHTML = bundledHTML.replace('</head>', `${cssBundle}\n</head>`);
    }
    
    // Add bundled JS before closing body tag
    if (bundledJS.length > 0) {
        const jsBundle = `\n<script>\n${bundledJS.join('\n\n')}\n</script>`;
        bundledHTML = bundledHTML.replace('</body>', `${jsBundle}\n</body>`);
    }
    
    // Add build information comment
    const buildInfo = `\n<!-- Bundled with Bun at ${new Date().toISOString()} -->\n`;
    bundledHTML = buildInfo + bundledHTML;
    
    // Ensure output directory exists
    const outputDir = dirname(output);
    mkdirSync(outputDir, { recursive: true });
    
    // Write the bundled HTML
    writeFileSync(output, bundledHTML);
    
    // Calculate file size
    const size = Buffer.byteLength(bundledHTML, 'utf-8');
    
    return {
        inputPath: input,
        outputPath: output,
        size,
        jsFiles: jsFiles.filter(existsSync),
        cssFiles: cssFiles.filter(existsSync),
    };
}

// Main execution
async function main() {
    const mode = process.argv[2] || MODES.all;
    const isProduction = process.env.NODE_ENV === 'production';
    
    log(`Build mode: ${mode} (${isProduction ? 'production' : 'development'})`);

    try {
        switch (mode) {
            case MODES.clean:
                cleanBuildDir();
                break;
                
            case MODES.server:
                await buildServer();
                break;
                
            case MODES.client:
                await buildClient();
                break;
                
            case MODES.html:
                await bundleHTML();
                break;
                
            case MODES.all:
                cleanBuildDir();
                await buildAll();
                break;
                
            case 'watch':
                cleanBuildDir();
                await watch();
                break;
                
            default:
                log(`Unknown mode: ${mode}`, 'error');
                log('Available modes: server, client, html, all, clean, watch');
                process.exit(1);
        }
    } catch (error) {
        log(`Build process failed: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.main) {
    main();
}

// Export for programmatic use
export { buildServer, buildClient, bundleHTML, buildAll, cleanBuildDir };
