"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableCheckboxOption = {
  id: string;
  label: string;
  detail?: string;
  searchText?: string;
  group?: string;
};

type SearchableCheckboxPickerProps = {
  name: string;
  options: SearchableCheckboxOption[];
  selectedIds?: string[];
  searchLabel: string;
  searchPlaceholder: string;
  selectedCountLabel: string;
  emptyMessage: string;
  noResultsMessage: string;
  required?: boolean;
  requiredMessage?: string;
};

function checkedIdsInForm(form: HTMLFormElement, name: string) {
  return Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    .filter((input) => input.name === name && input.checked)
    .map((input) => input.value);
}

export function SearchableCheckboxPicker({
  name,
  options,
  selectedIds: initialSelectedIds = [],
  searchLabel,
  searchPlaceholder,
  selectedCountLabel,
  emptyMessage,
  noResultsMessage,
  required = false,
  requiredMessage = "Hãy chọn ít nhất một mục.",
}: SearchableCheckboxPickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectionError, setSelectionError] = useState(false);
  const availableIds = useMemo(() => new Set(options.map((option) => option.id)), [options]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialSelectedIds.filter((selectedId) => availableIds.has(selectedId)),
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, SearchableCheckboxOption[]>();
    for (const option of options) {
      const groupName = option.group || "Danh sách";
      const groupOptions = groups.get(groupName) ?? [];
      groupOptions.push(option);
      groups.set(groupName, groupOptions);
    }
    return Array.from(groups.entries()).map(([groupName, groupOptions]) => ({
      groupName,
      options: groupOptions,
    }));
  }, [options]);

  function matches(option: SearchableCheckboxOption) {
    if (!normalizedQuery) return true;
    return [option.label, option.detail, option.searchText, option.group]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("vi").includes(normalizedQuery));
  }

  useEffect(() => {
    const root = rootRef.current;
    const form = root?.closest("form");
    if (!form) return;

    const syncAfterDraftRestore = () => {
      setSelectedIds(checkedIdsInForm(form, name));
      setSelectionError(false);
    };

    const validateRequiredSelection = (event: Event) => {
      if (!required || checkedIdsInForm(form, name).length > 0) {
        setSelectionError(false);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelectionError(true);
      searchRef.current?.focus();
    };

    form.addEventListener("idaily:form-draft-restored", syncAfterDraftRestore);
    form.addEventListener("submit", validateRequiredSelection, true);
    return () => {
      form.removeEventListener("idaily:form-draft-restored", syncAfterDraftRestore);
      form.removeEventListener("submit", validateRequiredSelection, true);
    };
  }, [name, required]);

  const matchedCount = options.filter(matches).length;
  const selectedOptions = selectedIds
    .map((selectedId) => options.find((option) => option.id === selectedId))
    .filter((option): option is SearchableCheckboxOption => option !== undefined);

  return (
    <div className="searchable-checkbox-picker" ref={rootRef}>
      <label className="searchable-picker-search" htmlFor={id + "-search"}>
        <span>{searchLabel}</span>
        <input
          autoComplete="off"
          aria-controls={id + "-list"}
          id={id + "-search"}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          ref={searchRef}
          type="search"
          value={query}
        />
      </label>

      <p aria-live="polite" className="searchable-picker-count" role="status">
        Đã chọn {selectedIds.length} {selectedCountLabel}
      </p>

      {options.length === 0 ? (
        <p className="searchable-picker-empty" role="status">{emptyMessage}</p>
      ) : (
        <>
          {required ? (
            <p className="field-help" id={id + "-required-help"}>
              Bắt buộc chọn ít nhất một mục.
            </p>
          ) : null}
          <div
            aria-describedby={[
              required ? id + "-required-help" : null,
              selectionError ? id + "-selection-error" : null,
            ].filter(Boolean).join(" ") || undefined}
            aria-invalid={selectionError || undefined}
            aria-label={searchLabel}
            className="searchable-picker-list"
            id={id + "-list"}
            role="group"
          >
          {groupedOptions.map(({ groupName, options: groupOptions }) => {
            const visibleGroup = groupOptions.some(matches);
            return (
              <fieldset className="searchable-picker-group" hidden={!visibleGroup} key={groupName}>
                <legend>{groupName}</legend>
                {groupOptions.map((option) => {
                  const visible = matches(option);
                  return (
                    <label
                      className="searchable-picker-option"
                      hidden={!visible}
                      key={option.id}
                    >
                      <input
                        checked={selectedSet.has(option.id)}
                        name={name}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedIds((current) => checked
                            ? (current.includes(option.id) ? current : [...current, option.id])
                            : current.filter((selectedId) => selectedId !== option.id));
                          setSelectionError(false);
                        }}
                        type="checkbox"
                        value={option.id}
                      />
                      <span className="searchable-picker-option-copy">
                        <strong>{option.label}</strong>
                        {option.detail ? <span className="secondary-text">{option.detail}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            );
          })}
          {matchedCount === 0 ? (
            <p className="searchable-picker-empty" role="status">{noResultsMessage}</p>
          ) : null}
          </div>
        </>
      )}

      {required && selectionError ? (
        <p className="message error" id={id + "-selection-error"} role="alert">{requiredMessage}</p>
      ) : null}

      {selectedOptions.length > 0 ? (
        <div className="searchable-picker-selected">
          <p className="field-help">Đang chọn:</p>
          <ul className="searchable-picker-selected-list">
            {selectedOptions.map((option) => (
              <li key={option.id}>
                <span>{option.label}</span>
                {option.detail ? <span className="secondary-text">{option.detail}</span> : null}
                <button
                  aria-label={"Bỏ chọn " + option.label}
                  className="searchable-picker-remove"
                  onClick={() => {
                    setSelectedIds((current) => current.filter((selectedId) => selectedId !== option.id));
                    setSelectionError(false);
                  }}
                  type="button"
                >
                  Bỏ chọn
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
