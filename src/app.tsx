import { useRef, useState } from "react";
import {
  ArrowDownToLine, Atom, Check, ChevronDown, FileImage,
  Files, Image as ImageIcon, Plus, RefreshCw, ShieldCheck,
  Trash2, UploadCloud, X, Zap
} from "lucide-react";

type Format = "image/png" | "image/jpeg" | "image/webp";

type FileItem = {
  id: number;
  file: File;
  preview: string;
  status: "ready" | "converting" | "done" | "error";
  output?: string;
  outputSize?: number;
};

const formats: { label: string; value: Format; ext: string }[] = [
  { label: "PNG", value: "image/png", ext: "png" },
  { label: "JPG", value: "image/jpeg", ext: "jpg" },
  { label: "WebP", value: "image/webp", ext: "webp" }
];

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [format, setFormat] = useState<Format>("image/webp");
  const [quality, setQuality] = useState(85);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const selected = Array.from(incoming).filter(file =>
      file.type.startsWith("image/") &&
      ["image/png", "image/jpeg", "image/webp"].includes(file.type)
    );

    const items = selected.map(file => ({
      id: Math.random(),
      file,
      preview: URL.createObjectURL(file),
      status: "ready" as const
    }));

    setFiles(prev => [...prev, ...items]);
  };

  const removeFile = (id: number) => {
    setFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
        if (item.output) URL.revokeObjectURL(item.output);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const convertFile = async (item: FileItem) => {
    return new Promise<string>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;

          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas unavailable");

          if (format === "image/jpeg") {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
          }

          context.drawImage(image, 0, 0);

          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error("Conversion failed"));
              return;
            }
            resolve(URL.createObjectURL(blob));
          }, format, quality / 100);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => reject(new Error("Invalid image"));
      image.src = item.preview;
    });
  };

  const convertAll = async () => {
    if (converting || !files.some(f => f.status === "ready" || f.status === "error")) return;

    setConverting(true);

    for (const item of files) {
      if (item.status === "done") continue;

      setFiles(prev => prev.map(f =>
        f.id === item.id ? { ...f, status: "converting" } : f
      ));

      try {
        const output = await convertFile(item);
        const response = await fetch(output);
        const blob = await response.blob();

        setFiles(prev => prev.map(f =>
          f.id === item.id
            ? { ...f, status: "done", output, outputSize: blob.size }
            : f
        ));
      } catch {
        setFiles(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: "error" } : f
        ));
      }
    }

    setConverting(false);
  };

  const download = async (item: FileItem) => {
    if (!item.output) return;

    const ext = formats.find(f => f.value === format)?.ext;
    const name = item.file.name.replace(/\.[^.]+$/, "");

    const link = document.createElement("a");
    link.href = item.output;
    link.download = `${name}.${ext}`;
    link.click();
  };

  const downloadAll = async () => {
    for (const item of files) {
      if (item.output) {
        await download(item);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  };

  const clearAll = () => {
    files.forEach(item => {
      URL.revokeObjectURL(item.preview);
      if (item.output) URL.revokeObjectURL(item.output);
    });
    setFiles([]);
  };

  const completed = files.filter(f => f.status === "done").length;
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  const size = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <div className="app">
      <header className="header">
        <a href="#" className="brand">
          <div className="brand-icon"><Atom size={23} /></div>
          <div>
            <div className="brand-name">hydrogen<span>.</span></div>
            <div className="brand-sub">BY ATOMIC</div>
          </div>
        </a>

        <div className="header-right">
          <span className="privacy"><ShieldCheck size={15} /> Files stay on your device</span>
          <span className="version">v1.0</span>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="eyebrow"><Zap size={13} /> SIMPLE. FAST. PRIVATE.</div>
          <h1>Transform <span>anything.</span></h1>
          <p>A universal file converter. No accounts, no uploads, no unnecessary complexity.</p>
        </section>

        <section className="workspace">
          <div className="section-heading">
            <div>
              <h2>Image converter</h2>
              <p>Convert your images between popular formats.</p>
            </div>
            <div className="format-badge"><ImageIcon size={14} /> IMAGE</div>
          </div>

          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={e => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="upload-icon"><UploadCloud size={27} /></div>
            <h3>Drop your images here</h3>
            <p>or <button className="browse" onClick={e => {
              e.stopPropagation();
              inputRef.current?.click();
            }}>browse files</button> from your device</p>
            <div className="supported">PNG <span>·</span> JPG <span>·</span> WebP</div>
          </div>

          <div className="settings">
            <div className="setting">
              <label>Convert to</label>
              <div className="select-wrap">
                <select value={format} onChange={e => {
                  setFormat(e.target.value as Format);
                  setFiles(prev => prev.map(f => ({
                    ...f, status: "ready", output: undefined, outputSize: undefined
                  })));
                }}>
                  {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <ChevronDown size={15} />
              </div>
            </div>

            <div className="setting quality-setting">
              <div className="quality-label">
                <label>Quality</label>
                <span>{quality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={e => {
                  setQuality(Number(e.target.value));
                  setFiles(prev => prev.map(f => ({
                    ...f, status: "ready", output: undefined, outputSize: undefined
                  })));
                }}
              />
            </div>
          </div>

          {files.length > 0 && (
            <section className="file-section">
              <div className="file-heading">
                <div>
                  <h3>Your files <span>{files.length}</span></h3>
                  <p>{size(totalSize)} total</p>
                </div>
                <button className="text-button" onClick={clearAll}><Trash2 size={14} /> Clear all</button>
              </div>

              <div className="file-list">
                {files.map(item => (
                  <div className="file-item" key={item.id}>
                    <img src={item.preview} className="thumbnail" alt="" />
                    <div className="file-info">
                      <div className="file-name">{item.file.name}</div>
                      <div className="file-meta">
                        {size(item.file.size)}
                        {item.status === "done" && item.outputSize !== undefined && (
                          <span className="success-text"> → {size(item.outputSize)}</span>
                        )}
                      </div>
                    </div>

                    <div className={`status ${item.status}`}>
                      {item.status === "ready" && "Ready"}
                      {item.status === "converting" && <><RefreshCw size={12} className="spin" /> Converting</>}
                      {item.status === "done" && <><Check size={13} /> Done</>}
                      {item.status === "error" && "Failed"}
                    </div>

                    {item.status === "done" ? (
                      <button className="icon-button download-button" title="Download" onClick={() => download(item)}>
                        <ArrowDownToLine size={17} />
                      </button>
                    ) : (
                      <button className="icon-button" title="Remove" onClick={() => removeFile(item.id)}>
                        <X size={17} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="actions">
                <button className="convert-button" disabled={converting || files.every(f => f.status === "done")} onClick={convertAll}>
                  {converting ? <><RefreshCw size={16} className="spin" /> Converting...</> : <><RefreshCw size={16} /> Convert {files.length - completed} {files.length - completed === 1 ? "file" : "files"}</>}
                </button>
                {completed > 0 && (
                  <button className="download-all" onClick={downloadAll}>
                    <ArrowDownToLine size={16} /> Download all ({completed})
                  </button>
                )}
              </div>
            </section>
          )}
        </section>

        <section className="features">
          <div className="feature">
            <div className="feature-icon"><ShieldCheck size={19} /></div>
            <h3>Private by design</h3>
            <p>Your files are processed locally in your browser. Nothing is uploaded.</p>
          </div>
          <div className="feature">
            <div className="feature-icon"><Zap size={19} /></div>
            <h3>Fast conversion</h3>
            <p>No waiting for uploads or server queues. Convert directly on your device.</p>
          </div>
          <div className="feature">
            <div className="feature-icon"><Files size={19} /></div>
            <h3>Batch processing</h3>
            <p>Convert multiple images in one go and download them individually.</p>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><Atom size={14} /> HYDROGEN <span>BY ATOMIC</span></div>
        <div>Built for simplicity. Made with care.</div>
        <div className="footer-element">H · 01</div>
      </footer>
    </div>
  );
}

export default App;
