"""Decode the actual rasterized PDF and PNG, comparing both to the saved booking URL.

Run after the real checkout E2E test. Optional QA dependencies:
python -m pip install pypdfium2 opencv-python numpy pillow pypdf
"""
import json
from pathlib import Path
import cv2
import numpy as np
import pypdfium2 as pdfium
from pypdf import PdfReader

output = Path(__file__).resolve().parents[1] / 'outputs'
reference = json.loads((output / 'cinematic-ticket-reference.json').read_text())
expected = reference['verification']
pdf_path = output / 'cinematic-ticket-print.pdf'
pdf = pdfium.PdfDocument(str(pdf_path))
decoded = []
for index in range(len(pdf)):
    pixels = np.array(pdf[index].render(scale=3).to_pil().convert('RGB'))
    value, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.cvtColor(pixels, cv2.COLOR_RGB2BGR))
    if value:
        decoded.append(value)
    if index == 0:
        cv2.imwrite(str(output / 'verified-ticket-pdf.png'), cv2.cvtColor(pixels, cv2.COLOR_RGB2BGR))
assert expected in decoded, 'Actual PDF QR does not decode to the saved booking credential'
text = '\n'.join(page.extract_text() or '' for page in PdfReader(str(pdf_path)).pages)
assert reference['id'] in text, 'Booking ID is missing from the actual PDF'
assert 'DEMO' in text.upper(), 'Printed ticket must remain labelled as a demo'
png = cv2.imread(str(output / 'cinematic-ticket-download.png'))
downloaded, _, _ = cv2.QRCodeDetector().detectAndDecode(png)
assert downloaded == expected, 'Downloaded ticket QR differs from the booking credential'
print(json.dumps({'pdf_pages': len(pdf), 'pdf_qr_matches_booking': True, 'png_qr_matches_booking': True, 'pdf_booking_id_present': True, 'demo_label_present': True}))
