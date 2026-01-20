
import React, { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { Download, ScanBarcode, Settings, Layers, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import JsBarcode from 'jsbarcode';

export default function BarcodeGenerator() {
    // Mode State
    const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

    // Generator Config
    const [value, setValue] = useState('12345678');
    const [format, setFormat] = useState('CODE128');
    const [width, setWidth] = useState(2);
    const [height, setHeight] = useState(100);
    const [displayValue, setDisplayValue] = useState(true);

    // Bulk State
    const [bulkInput, setBulkInput] = useState(''); // Text area input
    const [isProcessing, setIsProcessing] = useState(false);
    const [bulkStatus, setBulkStatus] = useState(null);

    const handleDownloadSingle = () => {
        const svg = document.querySelector(".barcode-container svg");
        if (!svg) return;

        const xml = new XMLSerializer().serializeToString(svg);
        const svg64 = btoa(xml);
        const b64Start = 'data:image/svg+xml;base64,';
        const image64 = b64Start + svg64;

        const img = new Image();
        img.src = image64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width + 40;
            canvas.height = img.height + 40;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 20, 20);

            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = "barcode_" + value + ".png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    };

    const handleBulkGenerate = async () => {
        setIsProcessing(true);
        setBulkStatus(null);

        try {
            const zip = new JSZip();
            // Parse by newline or comma
            const items = bulkInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

            if (items.length === 0) {
                alert("Please enter some values!");
                setIsProcessing(false);
                return;
            }

            const canvas = document.createElement('canvas');
            let count = 0;

            items.forEach(item => {
                try {
                    // Map generic format if needed, mostly react-barcode and jsbarcode align
                    JsBarcode(canvas, item, {
                        format: format,
                        width: width,
                        height: height,
                        displayValue: displayValue,
                        margin: 10,
                        background: "#ffffff"
                    });

                    const dataUrl = canvas.toDataURL('image/png');
                    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

                    // Sanitize filename
                    const safeName = item.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                    zip.file(safeName + ".png", base64Data, { base64: true });
                    count++;
                } catch (e) {
                    console.warn("Skipped invalid barcode value: " + item);
                }
            });

            if (count > 0) {
                const blob = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = "barcodes_bulk_" + Date.now() + ".zip";
                document.body.appendChild(link);
                link.click();
                link.remove();
                setBulkStatus("Generates " + count + " barcodes successfully!");
            } else {
                setBulkStatus("Failed to generate any valid barcodes.");
            }

        } catch (error) {
            console.error("Bulk Generation Error", error);
            setBulkStatus("An error occurred during generation.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            setBulkInput(evt.target.result);
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-5xl mx-auto py-10">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <ScanBarcode size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Barcode Generator</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Create standard barcodes for inventory and retail.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('single')}
                        className={"px-4 py-2 text-sm font-bold rounded-lg transition-all " + (activeTab === 'single' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}
                    >
                        Single
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={"px-4 py-2 text-sm font-bold rounded-lg transition-all " + (activeTab === 'bulk' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}
                    >
                        Bulk Creation
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Configuration Sidebar - Shared */}
                <motion.div
                    layout
                    className="md:col-span-1 space-y-6"
                >
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                            <Settings size={18} /> Configuration
                        </div>

                        {/* Only show Value input in Single Mode */}
                        {activeTab === 'single' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Value</label>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                    placeholder="Enter data..."
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Format</label>
                            <select
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                            >
                                <option value="CODE128">Code 128 (Standard)</option>
                                <option value="UPC">UPC (Retail)</option>
                                <option value="EAN13">EAN-13</option>
                                <option value="code39">Code 39</option>
                                <option value="itf14">ITF-14</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Width ({width})</label>
                                <input
                                    type="range" min="1" max="4" step="0.5"
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Height ({height})</label>
                                <input
                                    type="range" min="30" max="150"
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={displayValue}
                                onChange={(e) => setDisplayValue(e.target.checked)}
                                className="rounded text-indigo-600"
                            />
                            <label className="text-sm text-slate-600 dark:text-slate-300">Show Text</label>
                        </div>
                    </div>

                    {/* Action Button */}
                    {activeTab === 'single' ? (
                        <button
                            onClick={handleDownloadSingle}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                        >
                            <Download size={18} />
                            Download PNG
                        </button>
                    ) : (
                        <button
                            onClick={handleBulkGenerate}
                            disabled={isProcessing || !bulkInput}
                            className={"w-full py-3 font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 " + (isProcessing || !bulkInput ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none')}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
                            {isProcessing ? 'Generating Zip...' : 'Generate Bulk Zip'}
                        </button>
                    )}
                </motion.div>

                {/* Main Content Area */}
                <div className="md:col-span-2">
                    <AnimatePresence mode="wait">
                        {activeTab === 'single' ? (
                            <motion.div
                                key="single"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center p-10 border border-slate-200 dark:border-slate-800 min-h-[400px]"
                            >
                                <div className="bg-white p-8 rounded-xl shadow-sm barcode-container overflow-hidden max-w-full text-center">
                                    <Barcode
                                        value={value || 'EMPTY'}
                                        format={format}
                                        width={width}
                                        height={height}
                                        displayValue={displayValue}
                                        background="#ffffff"
                                        lineColor="#000000"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="bulk"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 min-h-[400px]"
                            >
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Bulk Input</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Enter barcode values separated by commas or new lines. You can also paste from Excel.</p>

                                    <textarea
                                        value={bulkInput}
                                        onChange={(e) => setBulkInput(e.target.value)}
                                        className="w-full h-48 p-4 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm bg-slate-50 dark:bg-slate-700 dark:text-white"
                                        placeholder="1001&#10;1002&#10;1003&#10;..."
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="bulk-file-upload"
                                        />
                                        <label
                                            htmlFor="bulk-file-upload"
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer text-sm font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <FileText size={16} />
                                            Import from File (CSV/TXT)
                                        </label>
                                    </div>
                                    <div className="text-xs text-slate-400 dark:text-slate-500">
                                        Supports .csv or .txt files
                                    </div>
                                </div>

                                {bulkStatus && (
                                    <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl flex items-center gap-2 text-sm font-medium">
                                        <CheckCircle size={16} />
                                        {bulkStatus}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

