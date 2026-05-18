import docx
import os
import zipfile

doc_path = 'Care bridge portal.docx'
output_dir = 'extracted_content'
images_dir = os.path.join(output_dir, 'images')

if not os.path.exists(images_dir):
    os.makedirs(images_dir)

# Extract Text
doc = docx.Document(doc_path)
full_text = []
for para in doc.paragraphs:
    full_text.append(para.text)

with open(os.path.join(output_dir, 'content.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(full_text))

# Extract Images (DOCX is a zip)
with zipfile.ZipFile(doc_path, 'r') as zip_ref:
    for file_info in zip_ref.infolist():
        if file_info.filename.startswith('word/media/'):
            zip_ref.extract(file_info, output_dir)
            # Rename to something more useful and move to images_dir
            old_path = os.path.join(output_dir, file_info.filename)
            new_name = os.path.basename(file_info.filename)
            new_path = os.path.join(images_dir, new_name)
            os.rename(old_path, new_path)

print(f"Extraction complete. Text saved to {output_dir}/content.txt. Images saved to {images_dir}.")
