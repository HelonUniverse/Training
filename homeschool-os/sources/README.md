# sources/

Authoritative source artifacts for the standards reference layer.

Files here are **evidence**, not code. They are committed so that the sha256
recorded against every import batch refers to bytes anybody can re-check, and so
that a family asking "where did this benchmark come from" has an answer that
survives a state re-publishing a PDF at the same URL.

## Putting an artifact here

    cp ~/Downloads/mathbeststandardsfinal.pdf <your local clone>/homeschool-os/sources/fldoe/
    git add homeschool-os/sources/fldoe/mathbeststandardsfinal.pdf
    git commit -m "Add FLDOE B.E.S.T. Mathematics source artifact"
    git push

The push matters. Claude Code sessions run in a cloud container with their own
filesystem: a file copied into a local clone is not visible to them until it has
been pushed and fetched.

## Rules

* The **original** artifact goes here, unmodified. Not a hand-edited CSV derived
  from it - the PDF is the source, and its sha256 stays attached to every import
  batch and every published standard that came out of it.
* One directory per authority (`fldoe/`, and others as they arrive).
* Never rename or re-save a file to "clean it up". The bytes are the identity;
  re-saving a PDF changes them and orphans every record that cited the old hash.
* Secondary references - parent guides, progressions, blueprints, correlation
  spreadsheets - are welcome, and register with their own `artifact_kind`. They
  cannot publish canonical standards (see `docs/architecture/18-*.md`).
