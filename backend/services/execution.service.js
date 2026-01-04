import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

const TEMP_DIR = path.join(process.cwd(), 'temp_execution');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const executeCode = async (language, code, filename = 'script') => {
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(TEMP_DIR, `${safeFilename}`);
    
    let command;
    let output;
    
    try {
        await writeFileAsync(filePath, code);

        switch (language.toLowerCase()) {
            case 'python':
            case 'py':
                command = `python "${filePath}"`;
                break;
            
            case 'cpp':
            case 'c++':
            case 'c': // Simple C support
                const exePath = filePath.replace(/\.[^/.]+$/, "") + ".exe";
                // Compile then run
                command = `g++ "${filePath}" -o "${exePath}" && "${exePath}"`;
                break;
            
            case 'java':
                // For Java, filename must match class name usually. We rely on user providing correct filename.
                const classPath = TEMP_DIR;
                // Compile then run. formatting: javac File.java && java -cp temp_dir File
                const className = path.basename(filePath, '.java');
                command = `javac "${filePath}" && java -cp "${classPath}" ${className}`;
                break;
                
            default:
                throw new Error(`Unsupported language for backend execution: ${language}`);
        }

        console.log(`Executing command: ${command}`);
        const { stdout, stderr } = await execAsync(command, { timeout: 10000 }); // 10s timeout
        
        output = stdout;
        if (stderr) {
            output += `\n[STDERR]\n${stderr}`;
        }

        return { output };

    } catch (error) {
        console.error('Execution error:', error);
        return { 
            error: error.message, 
            output: error.stdout || '', 
            stderr: error.stderr || '' 
        };
    } finally {
        // Cleanup - maybe not immediately if we want to debug, but for now yes
        // For C++/Java, clean up compiled binaries too
        try {
            if (fs.existsSync(filePath)) await unlinkAsync(filePath);
            
            if (language === 'cpp' || language === 'c++') {
                const exePath = filePath.replace(/\.[^/.]+$/, "") + ".exe";
                if (fs.existsSync(exePath)) await unlinkAsync(exePath);
            }
            if (language === 'java') {
                 const className = path.basename(filePath, '.java');
                 const classFile = path.join(TEMP_DIR, `${className}.class`);
                 if (fs.existsSync(classFile)) await unlinkAsync(classFile);
            }
        } catch (cleanupErr) {
            console.warn('Cleanup warning:', cleanupErr);
        }
    }
}
