# Google Drive server

This MCP server integrates with Google Drive to allow listing, reading, and searching files, as well as the ability to read and write to Google Sheets.

This project includes code originally developed by Anthropic, PBC, licensed under the MIT License from [this repo](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive).

## Components

### Tools

- **gdrive_search**

  - **Description**: Search for files in Google Drive.
  - **Input**:
    - `query` (string): Search query.
    - `pageToken` (string, optional): Token for the next page of results.
    - `pageSize` (number, optional): Number of results per page (max 100).
  - **Output**: Returns file names and MIME types of matching files.

- **gdrive_read_file**

  - **Description**: Read contents of a file from Google Drive.
  - **Input**:
    - `fileId` (string): ID of the file to read.
  - **Output**: Returns the contents of the specified file.

- **gsheets_read**

  - **Description**: Read data from a Google Spreadsheet with flexible options for ranges and formatting.
  - **Input**:
    - `spreadsheetId` (string): The ID of the spreadsheet to read.
    - `ranges` (array of strings, optional): Optional array of A1 notation ranges (e.g., `['Sheet1!A1:B10']`). If not provided, reads the entire sheet.
    - `sheetId` (number, optional): Specific sheet ID to read. If not provided with ranges, reads the first sheet.
  - **Output**: Returns the specified data from the spreadsheet.

- **gsheets_update_cell**
  - **Description**: Update a cell value in a Google Spreadsheet.
  - **Input**:
    - `fileId` (string): ID of the spreadsheet.
    - `range` (string): Cell range in A1 notation (e.g., `'Sheet1!A1'`).
    - `value` (string): New cell value.
  - **Output**: Confirms the updated value in the specified cell.

### Resources

The server provides access to Google Drive files:

- **Files** (`gdrive:///<file_id>`)
  - Supports all file types
  - Google Workspace files are automatically exported:
    - Docs → Markdown
    - Sheets → CSV
    - Presentations → Plain text
    - Drawings → PNG
  - Other files are provided in their native format

## Getting started

### Prerequisites

- [Mise](https://mise.jdx.dev/) - For managing Node.js versions and dependencies
- [PNPM](https://pnpm.io/) - Package manager (will be installed via Mise)

### Installation

1. Install the project using Mise:
   ```bash
   mise install
   ```

2. Build the server:
   ```bash
   pnpm run build
   ```

### Authentication

This server uses [Prefactor](https://prefactor.tech/) for authentication, which provides a secure and streamlined way to access Google Drive without storing credentials locally.

1. Set up your Prefactor account and configure Google Drive access
2. Configure the required environment variables in your `.mise.local.toml` file:

```toml
[env]
MCP_AUTH_ISSUER = "<YOUR PREFACTOR MCP ISSUER>"
AUTH_ISSUER = "<YOUR PREFACTOR ISSUER>"
AUTH_CLIENT_ID = "<YOUR PREFACTOR CLIENT ID>"
AUTH_CLIENT_SECRET = "<YOUR PREFACTOR CLIENT SECRET>"
```

3. No local OAuth setup or credential files are required
4. Authentication is handled securely through Prefactor's infrastructure

### Usage with MCP Clients

This server can be used as an MCP remote server. To connect to it, add the following to your MCP client configuration:

```json
{
  "mcpServers": {
    "gdrive": {
      "server": "https://localhost:3000/mcp"
    }
  }
}
```

Alternatively, you can run it as a standalone remote server and connect to it via network:

```bash
pnpm run start
```

The server will start and listen for MCP client connections on the configured host and port.

### Development

For development with auto-rebuild on changes:
```bash
pnpm run watch
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
