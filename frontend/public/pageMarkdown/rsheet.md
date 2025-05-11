A Rust-based, multi-threaded spreadsheet engine exposing a simple TCP or terminal interface. It parses cell commands (`get`, `set`), evaluates expressions with dependencies, and broadcasts updates to recalculate dependent cells concurrently.

---

## Overview

This project implements a concurrent spreadsheet server in Rust, comprising two binaries:

- **CLI Mode**: run in the terminal, reading commands and displaying cell values interactively.
- **Server Mode**: listen on a TCP address, accept multiple client connections, and process commands in parallel.

At its core is a `Sheet` model that stores cell data (value, expression, dependencies, timestamp) behind an `Arc<Mutex<...>>`, allowing safe shared access and mutation across threads.

---

## Functionality

### Command Parsing

- Commands follow `rsheet_lib::Command` syntax:
  - `get <Cell>` retrieves a cell’s current value.
  - `set <Cell> <Expression>` assigns and evaluates a formula.

### Cell Evaluation

- `Sheet::set` parses expressions via `CellExpr`, identifies variable names, and builds an argument map by reading other cells (`get_cell_value_or_error`).
- Supports ranges (`A1_B2`), row/column vectors, and matrices to pass arrays into functions.
- Errors propagate: a cell depending on an error cell yields a `DependsOnErrorCell` error.

### Dependency Management & Concurrency

- After setting a cell, its name is sent over an `mpsc::channel` to a background thread that re-evaluates all dependent cells via `Sheet::process_dependencies`.
- Each client connection runs in its own thread, sharing the same `Arc<Sheet>` and `Sender<String>` for dependency notifications.
- Uses `std::thread::spawn` and channel communication for scalable, non-blocking updates.

### Server Loop

- In `lib.rs`, `start_server` accepts new connections via a generic `Manager` trait (TCP or terminal).
- For each `NewConnection`, spawns a handler thread executing `access_sheet`, reading commands, writing replies, and dispatching dependency messages.
- Graceful shutdown when clients disconnect or on I/O errors.

---

## Features

- **Concurrency**: multi-threaded connection handling and background dependency processing.
- **Thread-Safe State**: `Arc<Mutex<HashMap<...>>>` for shared cell storage.  
- **Reactive Updates**: automatic recalculation of dependent cells triggered by channels.  
- **Flexible Interface**: switch between terminal and TCP server modes via the `Manager` abstraction.  
- **Expression Support**: arithmetic, built-in functions, cell ranges, vectors, and matrices.  
- **Error Propagation**: concise errors for circular dependencies or invalid references.  

---

## Tech Stack

- **Language**: Rust 1.70+  
- **Synchronization**: `std::sync::{Arc, Mutex, mpsc}`  
- **Date/Time**: `chrono::Utc` for timestamps  
- **Logging**: `env_logger` and `log` for lifecycle events  

