import csv
import hashlib
import io
import json
import zipfile
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from fastapi import HTTPException
from openpyxl import load_workbook
from pydantic import BaseModel, ConfigDict, Field

MAX_SIZE = 5 * 1024 * 1024
MAX_ROWS = 5000


class ColumnMapping(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=100)
    amount: str = Field(min_length=1, max_length=100)
    reference: str = Field(default="", max_length=100)
    date_format: str = Field(default="%Y-%m-%d", pattern=r"^(%Y-%m-%d|%d/%m/%Y|%m/%d/%Y)$")
    decimal_separator: str = Field(default=".", pattern=r"^[.,]$")


def fingerprint(account: str, row: dict):
    canonical = json.dumps(
        [account, row["date"], row["amount"], row["reference"], row["description"]],
        ensure_ascii=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def read_rows(content: bytes, filename: str):
    if not content or len(content) > MAX_SIZE:
        raise HTTPException(422, "Choose a non-empty CSV/XLSX file under 5 MB")
    suffix = Path(filename).suffix.lower()
    try:
        if suffix == ".csv":
            text = content.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            headers = reader.fieldnames or []
            rows = []
            for index, row in enumerate(reader):
                if index >= MAX_ROWS:
                    raise HTTPException(422, f"Maximum {MAX_ROWS} rows per import")
                rows.append(row)
        elif suffix == ".xlsx":
            archive = zipfile.ZipFile(io.BytesIO(content))
            if sum(info.file_size for info in archive.infolist()) > 30 * 1024 * 1024:
                raise HTTPException(422, "Uncompressed workbook is too large")
            book = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            try:
                iterator = book.active.iter_rows(values_only=True)
                headers = [str(value or "") for value in next(iterator)]
                rows = []
                for index, values in enumerate(iterator):
                    if index >= MAX_ROWS:
                        raise HTTPException(422, f"Maximum {MAX_ROWS} rows per import")
                    rows.append(dict(zip(headers, values, strict=False)))
            finally:
                book.close()
        else:
            raise HTTPException(422, "Only UTF-8 CSV and XLSX files are supported; PDF is deferred")
    except (
        UnicodeDecodeError,
        csv.Error,
        zipfile.BadZipFile,
        StopIteration,
        ValueError,
        KeyError,
    ) as error:
        raise HTTPException(
            422, "Could not parse file. Check format and column headers."
        ) from error
    if not headers or len(set(headers)) != len(headers) or len(headers) > 100:
        raise HTTPException(422, "Use 1–100 distinct non-empty column headers")
    return headers, rows


def normalize(content: bytes, filename: str, mapping: ColumnMapping):
    headers, raw = read_rows(content, filename)
    required = [mapping.date, mapping.amount, mapping.description]
    if mapping.reference:
        required.append(mapping.reference)
    if any(column not in headers for column in required):
        raise HTTPException(422, "Mapped column does not exist in this statement")
    valid = []
    errors = []
    for index, row in enumerate(raw, start=2):
        try:
            value = str(row.get(mapping.amount, "")).strip()
            if mapping.decimal_separator == ",":
                value = value.replace(".", "").replace(",", ".")
            else:
                value = value.replace(",", "")
            number = Decimal(value)
            minor = number * 100
            if not number.is_finite() or minor != minor.to_integral_value() or abs(minor) > 10**12:
                raise ValueError("Amount needs at most 2 decimal places and must be within limits")
            raw_date = row.get(mapping.date)
            occurred = (
                raw_date.date()
                if isinstance(raw_date, datetime)
                else datetime.strptime(str(raw_date).strip(), mapping.date_format).date()
            )
            description = str(row.get(mapping.description) or "").strip()
            reference = str(row.get(mapping.reference) or "").strip() if mapping.reference else ""
            if not description or len(description) > 500 or len(reference) > 150:
                raise ValueError("Description/reference missing or too long")
            valid.append(
                dict(
                    row_number=index,
                    date=str(occurred),
                    amount=int(minor),
                    description=description,
                    reference=reference,
                )
            )
        except (ValueError, TypeError, InvalidOperation) as error:
            errors.append({"row": index, "error": str(error)[:150]})
    return headers, valid, errors
