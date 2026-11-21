// Client-side PDF text extraction utility
// Uses PDF.js from CDN if available; falls back to native Web Streams decompression

export async function extractTextFromPdf(arrayBuffer, password = '') {
  // 1. Try PDF.js (CDN)
  try {
    let pdfjs = window.pdfjsLib;
    if (!pdfjs) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          } else {
            reject(new Error('pdfjsLib not loaded'));
          }
        };
        script.onerror = () => reject(new Error('CDN script failed'));
        document.head.appendChild(script);
      });
      pdfjs = window.pdfjsLib;
    }

    if (pdfjs) {
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        password: password || undefined,
      });

      // Handle password if protected
      loadingTask.onPassword = (callback, reason) => {
        const pass = prompt(
          reason === 1
            ? 'This statement PDF is password protected. Please enter the password (e.g. DDMM + card last 4 digits / PAN / DOB):'
            : 'Incorrect password. Please try again:'
        );
        if (pass) {
          callback(pass);
        } else {
          callback(new Error('Password prompt cancelled'));
        }
      };

      const pdf = await loadingTask.promise;
      let textLines = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        let currentLine = '';
        let lastY = null;

        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            if (currentLine.trim()) textLines.push(currentLine.trim());
            currentLine = '';
          }
          currentLine += (currentLine ? ' ' : '') + item.str;
          lastY = item.transform[5];
        }
        if (currentLine.trim()) textLines.push(currentLine.trim());
      }

      if (textLines.length > 0) {
        return textLines.join('\n');
      }
    }
  } catch (err) {
    if (err?.name === 'PasswordException' || err?.message?.includes('password')) {
      const pass = prompt('PDF statement is password protected. Enter password:');
      if (pass) {
        return extractTextFromPdf(arrayBuffer, pass);
      }
      throw new Error('PDF is password protected.');
    }
    console.warn('PDF.js extraction failed or offline, falling back to native stream parser...', err);
  }

  // 2. Native Fallback: Scan stream objects & inflate
  return await extractTextFromPdfNative(arrayBuffer);
}

// Native parser for uncompressed or FlateDecode PDF streams using native browser DecompressionStream
async function extractTextFromPdfNative(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);
  let extracted = [];

  // Match stream ... endstream
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(latin1)) !== null) {
    const streamStart = match.index + match[0].indexOf('\n') + 1;
    const streamEnd = match.index + match[0].lastIndexOf('\nendstream');
    if (streamEnd <= streamStart) continue;

    const streamBytes = bytes.slice(streamStart, streamEnd);
    let streamText = '';

    // Check if FlateDecode
    try {
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(streamBytes);
      writer.close();
      streamText = await new Response(ds.readable).text();
    } catch {
      try {
        const ds2 = new DecompressionStream('deflate-raw');
        const writer2 = ds2.writable.getWriter();
        writer2.write(streamBytes);
        writer2.close();
        streamText = await new Response(ds2.readable).text();
      } catch {
        // Plain uncompressed stream
        streamText = new TextDecoder('latin1').decode(streamBytes);
      }
    }

    if (streamText) {
      // Extract [...] TJ
      const tjArrRegex = /\[(.*?)\]\s*TJ/gs;
      let tjM;
      while ((tjM = tjArrRegex.exec(streamText)) !== null) {
        const s = (tjM[1].match(/\((.*?)\)/g) || []).map(x => x.slice(1, -1)).join('');
        if (s.trim()) extracted.push(s.trim());
      }

      // Extract (...) Tj
      const tjSingle = /\((.*?)\)\s*Tj/gs;
      let tjS;
      while ((tjS = tjSingle.exec(streamText)) !== null) {
        if (tjS[1]?.trim()) extracted.push(tjS[1].trim());
      }
    }
  }

  if (extracted.length > 0) {
    return extracted.join('\n');
  }

  // Final fallback: plain text lines
  const lines = latin1.split(/\r?\n/).filter(l => l.length > 10 && /[a-zA-Z]/.test(l) && /\d/.test(l));
  return lines.join('\n');
}
