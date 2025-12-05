# Legacy Code Revival AI - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Uploading a Codebase](#uploading-a-codebase)
3. [Monitoring Analysis Progress](#monitoring-analysis-progress)
4. [Viewing Analysis Results](#viewing-analysis-results)
5. [Downloading Reports](#downloading-reports)
6. [Managing Projects](#managing-projects)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Getting Started

Welcome to Legacy Code Revival AI! This tool helps you analyze legacy codebases to understand their structure, identify issues, and plan modernization efforts.

### First Steps

1. **Access the Dashboard**: When you first open the application, you'll see the main dashboard
2. **Upload Your First Project**: Click the "New Analysis" button to get started
3. **Monitor Progress**: Watch real-time updates as your code is analyzed
4. **Review Results**: Explore detailed metrics, issues, and recommendations

---

## Uploading a Codebase

### Upload Methods

The application supports three ways to upload your codebase:

#### 1. GitHub Repository

- Click "New Analysis" button
- Select the "GitHub" tab
- Enter your repository URL (e.g., `https://github.com/username/repo`)
- Click "Start Analysis"

**Supported formats:**
- `https://github.com/username/repo`
- `https://github.com/username/repo.git`

#### 2. ZIP File Upload

- Click "New Analysis" button
- Select the "ZIP Upload" tab
- Drag and drop your ZIP file or click to browse
- Maximum file size: 100MB
- Click "Start Analysis"

**Tips:**
- Compress your codebase into a ZIP file before uploading
- Exclude `node_modules`, `vendor`, and other dependency folders to reduce size
- Ensure your ZIP contains the source code at the root level

#### 3. Local Directory (Coming Soon)

This feature will allow you to analyze code directly from your local file system.

### Upload Progress

- A progress bar shows upload status
- File size validation occurs before upload
- Error messages appear if validation fails

---

## Monitoring Analysis Progress

### Progress Tracker

Once analysis starts, you'll see a real-time progress tracker showing:

- **Progress Bar**: Visual indicator of completion (0-100%)
- **Current Stage**: What the system is currently analyzing
- **Stage Checklist**: All analysis stages with completion status
- **Estimated Time**: Approximate time remaining

### Analysis Stages

1. **Uploading**: Transferring your code to the server
2. **Detecting Languages**: Identifying programming languages used
3. **Analyzing Dependencies**: Examining external libraries and frameworks
4. **Calculating Metrics**: Computing code quality metrics
5. **Detecting Issues**: Finding code smells and potential problems
6. **Generating Report**: Creating comprehensive analysis report

### Real-time Updates

- Progress updates automatically via WebSocket connection
- No need to refresh the page
- Connection status indicator shows if you're connected

---

## Viewing Analysis Results

### Dashboard Overview

The main dashboard displays all your projects with:

- **Project Name**: Identifier for your codebase
- **Status Badge**: Current state (Pending, Analyzing, Completed, Failed)
- **Timestamp**: When the project was created or last updated
- **Quick Actions**: View details or delete project

### Filtering and Sorting

**Filter by Status:**
- All Projects
- Pending
- Analyzing
- Completed
- Failed

**Sort Options:**
- Date (newest first)
- Name (alphabetical)
- Status

**Search:**
- Type in the search box to filter projects by name
- Search is debounced for better performance

### Project Details Page

Click on any project card to view detailed results across five tabs:

#### 1. Overview Tab

- Summary statistics
- Key metrics at a glance
- Overall health score
- Quick insights

#### 2. Languages Tab

- **Language Distribution Chart**: Visual breakdown of languages used
- **Language List**: Detailed percentages and line counts
- **Color Coding**: Each language has a distinct color

#### 3. Dependencies Tab

- **Dependency List**: All external libraries and frameworks
- **Version Information**: Current versions in use
- **Type Filtering**: Filter by runtime or development dependencies
- **Framework Detection**: Identified frameworks and their versions
- **Search**: Find specific dependencies quickly

#### 4. Metrics Tab

- **Maintainability Index**: Score from 0-100 (higher is better)
  - 85-100: Excellent
  - 65-84: Good
  - 50-64: Fair
  - Below 50: Needs attention
- **Lines of Code**: Total, code, comments, blank lines
- **Complexity Metrics**: Cyclomatic complexity with visual indicators
- **Code Quality Gauges**: Visual representation of metric health

#### 5. Issues Tab

- **Issue List**: All detected code smells and problems
- **Severity Levels**: Critical, High, Medium, Low
- **Color Coding**: Red (critical), orange (high), yellow (medium), blue (low)
- **File Location**: Exact file path and line number
- **Code Snippets**: Context around each issue
- **Filtering**: Filter by type and severity
- **Pagination**: Navigate through large issue lists

---

## Downloading Reports

### Report Formats

Download analysis results in multiple formats:

1. **JSON**: Machine-readable format for integration
2. **PDF**: Professional report for sharing
3. **Markdown**: Human-readable format for documentation

### How to Download

1. Navigate to a completed project
2. Click the "Download Report" button
3. Select your preferred format from the dropdown
4. Report downloads automatically

### Report Contents

All reports include:
- Project summary
- Language distribution
- Dependency analysis
- Code metrics
- Detected issues with locations
- Recommendations

### Sharing Reports

- Copy the report URL to share with team members
- Downloaded files can be attached to emails or tickets
- JSON format can be imported into other tools

---

## Managing Projects

### Deleting Projects

1. Find the project card on the dashboard
2. Click the delete icon (trash can)
3. Confirm deletion in the dialog
4. Project and all associated data are permanently removed

**Note:** This action cannot be undone. Make sure to download any reports you need before deleting.

### Project Status

- **Pending**: Queued for analysis
- **Analyzing**: Currently being processed
- **Completed**: Analysis finished successfully
- **Failed**: Analysis encountered an error

### Failed Projects

If a project fails:
1. Check the error message displayed
2. Click "Retry" to attempt analysis again
3. Verify your codebase meets requirements
4. Contact support if issues persist

---

## Keyboard Shortcuts

Enhance your productivity with keyboard shortcuts:

- **`Ctrl/Cmd + K`**: Open search
- **`Ctrl/Cmd + N`**: New analysis
- **`Esc`**: Close modals/dialogs
- **`Tab`**: Navigate between elements
- **`Enter`**: Confirm actions
- **`Arrow Keys`**: Navigate lists and tabs

### Accessibility

- Full keyboard navigation support
- Screen reader compatible
- ARIA labels on all interactive elements
- Focus indicators for keyboard users
- High contrast mode support

---

## Troubleshooting

### Upload Issues

**Problem**: Upload fails or times out
- **Solution**: Check your internet connection
- **Solution**: Ensure file size is under 100MB
- **Solution**: Verify ZIP file is not corrupted

**Problem**: Invalid GitHub URL
- **Solution**: Use the full repository URL
- **Solution**: Ensure repository is public or you have access
- **Solution**: Check for typos in the URL

### Analysis Issues

**Problem**: Analysis stuck at a stage
- **Solution**: Wait a few minutes (large codebases take time)
- **Solution**: Check your internet connection
- **Solution**: Refresh the page to reconnect

**Problem**: Analysis failed
- **Solution**: Check the error message for details
- **Solution**: Verify your codebase structure is valid
- **Solution**: Try uploading again
- **Solution**: Contact support with the error details

### Display Issues

**Problem**: Charts not displaying
- **Solution**: Refresh the page
- **Solution**: Clear browser cache
- **Solution**: Try a different browser

**Problem**: Real-time updates not working
- **Solution**: Check WebSocket connection status
- **Solution**: Disable browser extensions that might block WebSockets
- **Solution**: Check firewall settings

### Performance Issues

**Problem**: Application is slow
- **Solution**: Close unused tabs
- **Solution**: Clear browser cache
- **Solution**: Use a modern browser (Chrome, Firefox, Edge, Safari)
- **Solution**: Check your internet speed

---

## FAQ

### General Questions

**Q: What types of codebases can I analyze?**
A: The system supports most programming languages including JavaScript, TypeScript, Python, Java, C#, Ruby, PHP, Go, and many more.

**Q: Is my code secure?**
A: Yes, your code is processed securely and is not shared with third parties. See our privacy policy for details.

**Q: How long does analysis take?**
A: Analysis time depends on codebase size. Small projects (< 10k LOC) take 1-2 minutes, medium projects (10k-100k LOC) take 5-10 minutes, and large projects (> 100k LOC) may take 15-30 minutes.

**Q: Can I analyze private repositories?**
A: Currently, only public GitHub repositories are supported. Private repository support is coming soon.

### Technical Questions

**Q: What is the Maintainability Index?**
A: A metric that combines cyclomatic complexity, lines of code, and Halstead volume to produce a score from 0-100. Higher scores indicate more maintainable code.

**Q: What are code smells?**
A: Code smells are patterns in code that may indicate deeper problems. They're not bugs but suggest areas that could be improved.

**Q: Can I export data for use in other tools?**
A: Yes, download reports in JSON format for integration with other tools and systems.

**Q: How accurate is the dependency detection?**
A: The system analyzes package manifests (package.json, requirements.txt, pom.xml, etc.) for high accuracy. Manual dependencies may not be detected.

### Account & Billing

**Q: Do I need an account?**
A: Currently, no account is required. All projects are stored locally in your browser session.

**Q: Is there a limit on projects?**
A: There's no hard limit, but browser storage constraints may apply. Delete old projects to free up space.

**Q: Is this service free?**
A: Pricing information is available on our website. Contact sales for enterprise plans.

### Support

**Q: How do I report a bug?**
A: Use the feedback button in the application or email support@legacyrevival.ai

**Q: Where can I request features?**
A: Submit feature requests through our GitHub repository or contact us directly.

**Q: Is there API access?**
A: API access is available for enterprise customers. Contact sales for details.

---

## Additional Resources

- **Documentation**: [Full API Documentation](https://docs.legacyrevival.ai)
- **Blog**: [Best Practices & Tutorials](https://blog.legacyrevival.ai)
- **Support**: support@legacyrevival.ai
- **GitHub**: [Report Issues](https://github.com/legacyrevival/issues)

---

## Tips for Best Results

1. **Clean Your Codebase**: Remove build artifacts and dependencies before uploading
2. **Use Descriptive Names**: Name your projects clearly for easy identification
3. **Regular Analysis**: Re-analyze after major changes to track improvements
4. **Review All Tabs**: Don't just look at the overview - explore all analysis tabs
5. **Download Reports**: Keep records of analysis for comparison over time
6. **Act on Issues**: Use the issues tab to prioritize refactoring efforts
7. **Share Results**: Use reports to communicate with your team about code quality

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Need Help?** Click the help icon (?) in the top right corner of the application.
