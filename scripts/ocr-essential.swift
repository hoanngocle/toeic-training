import Foundation
import AppKit
import PDFKit
import Vision

let args = CommandLine.arguments
guard args.count >= 4, let pdf = PDFDocument(url: URL(fileURLWithPath: args[1])) else { fatalError("Usage: OCR pdf output-directory page-numbers...") }
let out = URL(fileURLWithPath: args[2], isDirectory: true)
try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
for arg in args.dropFirst(3) {
    guard let n = Int(arg), let page = pdf.page(at: n - 1) else { continue }
    let target = out.appendingPathComponent(String(format: "%03d.json", n))
    if FileManager.default.fileExists(atPath: target.path) { continue }
    try autoreleasepool {
        let bounds = page.bounds(for: .mediaBox)
        let image = page.thumbnail(of: NSSize(width: bounds.width * 2.5, height: bounds.height * 2.5), for: .mediaBox)
        var rect = CGRect(origin: .zero, size: image.size)
        guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { fatalError("No image") }
        var rows: [[String: Any]] = []
        let regions = ProcessInfo.processInfo.environment["ESSENTIAL_OCR_COLUMNS"] == "1"
            ? [CGRect(x: 0, y: 0, width: 0.49, height: 1), CGRect(x: 0.49, y: 0, width: 0.51, height: 1)]
            : [CGRect(x: 0, y: 0, width: 1, height: 1)]
        for region in regions {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["en-US"]
            request.usesLanguageCorrection = false
            let cropRect = CGRect(x: region.minX * Double(cg.width), y: 0, width: region.width * Double(cg.width), height: Double(cg.height))
            guard let cropped = cg.cropping(to: cropRect) else { fatalError("No column image") }
            try VNImageRequestHandler(cgImage: cropped).perform([request])
            rows += (request.results ?? []).compactMap { item in
                guard let text = item.topCandidates(1).first else { return nil }
                return ["text": text.string, "confidence": text.confidence, "x": region.minX + item.boundingBox.minX * region.width, "y": 1-item.boundingBox.maxY, "w": item.boundingBox.width * region.width, "h": item.boundingBox.height]
            }
        }
        try JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted, .sortedKeys]).write(to: target)
        print("OCR \(n): \(rows.count) lines")
        fflush(stdout)
    }
}
