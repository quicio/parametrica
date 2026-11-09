## Why

A single global boolean cannot express a set of independently hollow objects.
Subtracting every inner shell from every outer shell destroys the set, and a
plain multi-body merge cannot make each pair hollow first.

## What Changes

- Add `fabrication.groups`, an ordered list of boolean groups by layer id.
- Run each group independently with union, difference or intersection.
- Export the group results as separate bodies in one 3MF.
- Keep the existing single-boolean behavior when groups are absent.
- Report group metadata and disable the single boolean selector for grouped
  presets.

## Out of Scope

- Sequential union-then-difference inside one group.
- New CSG engines.
- UI editing of group membership.
