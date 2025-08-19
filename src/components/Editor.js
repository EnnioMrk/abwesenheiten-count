// ...existing code...

// Modify the container div to include the editor-container class
return (
    <div className="editor-container">
        // ...existing code for the grid...
        <div
            className="ag-theme-alpine"
            style={{
                // Remove any fixed width if it exists or make it responsive
                height: 500,
                // width will be controlled by CSS
            }}
        >
            <AgGridReact
            // ...existing code...
            />
        </div>
    </div>
);

// ...existing code...
