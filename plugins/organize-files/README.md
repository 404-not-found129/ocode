# Organize Files

Sorts the loose files in a messy folder, like Downloads, into subfolders by type, month or extension. It always shows you the plan first and can undo the whole thing.

## Usage

- Right-click a folder in the Explorer → **Organize Files in This Folder…**
- Run **Organize: Sort My Downloads Folder…** from the command palette
- Or type **`/organize`** in the chat (current folder) or **`/organize ~/Desktop`**

Choose how to group the files, check the summary ("Move 23 files → Images 10 · Documents 8 · …"), and confirm. Changed your mind? Run **Organize: Undo Last Organize**.

| Command | Keys |
| --- | --- |
| Organize: Sort Files in Current Folder into Subfolders… | — |
| Organize: Sort My Downloads Folder… | — |
| Organize: Undo Last Organize | — |

## Grouping modes

| Mode | Example folders |
| --- | --- |
| **By type** | Images, Videos, Audio, Documents, Archives, Code, Installers, Fonts, Models, Other |
| **By month modified** | 2026-10, 2026-09, … |
| **By extension** | PDF, PNG, ZIP, NO EXTENSION, … |

"Models" collects AI model files (`.gguf`, `.safetensors`, `.ckpt`, `.onnx` …).

## Safety

- Only files directly in the folder are moved; subfolders and hidden files are left alone.
- Nothing is overwritten. If `Images/photo.png` already exists, the new one becomes `photo (1).png`.
- Undo moves every file back and removes any folders it created, as long as they're empty. Only the most recent organize can be undone.

## Customizing

The categories are a list at the top of [`index.js`](index.js) (`CATEGORIES`). Add a group or extension there and reload the window. For example, to add a "Spreadsheets" folder:

```js
Spreadsheets: ['xls', 'xlsx', 'ods', 'csv'],
```

Put it above `Documents`, because the first matching group wins.
