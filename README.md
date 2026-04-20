# CANBusLogs_2_CSV

**CANBusLogs_2_CSV** is a Python tool that converts CAN bus log files into **CSV** with **DBC-based signal decoding**.  
It supports multiple log formats from common automotive tools and provides both a **command-line interface (CLI)** and a **graphical user interface (GUI)**.

The converter is designed for post-processing CAN measurements and generating CSV files suitable for further analysis (Excel, MATLAB, Python, etc.).

---

## Features

- **Multi-format CAN log parsing**
  - BusMaster 3.2.2
  - PCAN-View 2.x / 4.x
  - CL2000
  - TRC / text logs (depending on source format)

- **DBC-based signal decoding**
  - Intel / Motorola endianness
  - Signed and unsigned signals
  - Scaling, offset, min/max, units
  - Optional extraction of `VAL_` tables to decoded textual values

- **CSV output customization**
  - Custom delimiter (default `;`)
  - Signal naming modes:
    - `signal`
    - `message.signal`
  - Optional **message counter** pseudo-signal
  - Optional **message pulser** pseudo-signal
  - Optional **units row**

- **Graphical User Interface (GUI)**
  - Based on Tkinter
  - File selection for CAN logs and multiple DBC files
  - Same conversion options available from the CLI
  - Optional MDF4 (`.mf4`) preprocessing via `mdf2peak.exe`

---

## Requirements

- **Python 3.x**
- No external Python dependencies (standard library only)

> **Note**  
> MDF4 conversion in the GUI workflow requires Windows and the bundled `_aux/mdf2peak.exe`.

---

## Usage

### Command Line Interface (CLI)

Basic usage:

```bash
python CANBusLogs_2_CSV.py <log_file> <dbc1> [dbc2 ...] -o output.csv
``