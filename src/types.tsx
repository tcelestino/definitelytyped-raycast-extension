import { useState, useMemo } from "react";
import { ActionPanel, Action, Icon, List, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const NPM_SEARCH_BASE = "https://registry.npmjs.org/-/v1/search";
const DT_GITHUB_TYPES_BASE = "https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types";
const NPM_BASE = "https://www.npmjs.com/package";
const NPMX_BASE = "https://npmx.dev/package";

type NpmSearchResponse = {
  objects: Array<{ package: { name: string } }>;
};

type TypePackage = {
  dirName: string;
  displayName: string;
  installName: string;
  npmUrl: string;
  npmxUrl: string;
  githubUrl: string;
};

function resolvePackageNames(dirName: string): Pick<TypePackage, "displayName" | "installName"> {
  const installName = `@types/${dirName}`;
  if (dirName.includes("__")) {
    const [scope, pkg] = dirName.split("__");
    return { displayName: `@${scope}/${pkg}`, installName };
  }
  return { displayName: dirName, installName };
}

function toTypePackage(npmName: string): TypePackage {
  const dirName = npmName.replace("@types/", "");
  const { displayName, installName } = resolvePackageNames(dirName);
  return {
    dirName,
    displayName,
    installName,
    npmUrl: `${NPM_BASE}/${installName}`,
    npmxUrl: `${NPMX_BASE}/${installName}`,
    githubUrl: `${DT_GITHUB_TYPES_BASE}/${dirName}`,
  };
}

function EmptyView({
  error,
  shouldSearch,
  isLoading,
  packages,
  searchText,
}: {
  error?: Error;
  shouldSearch: boolean;
  isLoading: boolean;
  packages: TypePackage[];
  searchText: string;
}) {
  if (error) {
    return <List.EmptyView icon={Icon.ExclamationMark} title="Search failed" description={error.message} />;
  }
  if (!shouldSearch) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Search @types packages"
        description="Type at least 2 characters to search"
      />
    );
  }
  if (!isLoading && packages.length === 0) {
    return (
      <List.EmptyView icon={Icon.XMarkCircle} title="No packages found" description={`No match for "${searchText}"`} />
    );
  }
  return null;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const shouldSearch = searchText.length >= 2;

  const { isLoading, data, error } = useFetch<NpmSearchResponse>(
    `${NPM_SEARCH_BASE}?text=%40types%2F${encodeURIComponent(searchText)}&size=20`,
    { execute: shouldSearch, keepPreviousData: false },
  );

  const packages = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();

    if (!data.objects) return [];

    return data.objects
      .map(({ package: pkg }) => toTypePackage(pkg.name))
      .filter((pkg) => {
        if (seen.has(pkg.dirName)) return false;
        seen.add(pkg.dirName);
        return true;
      });
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search TypeScript type packages..."
      searchText={searchText}
    >
      {EmptyView({ error, shouldSearch, isLoading, packages, searchText })}
      {packages.map((pkg) => (
        <List.Item
          key={pkg.dirName}
          icon={Icon.Code}
          title={pkg.displayName}
          subtitle={pkg.installName}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={`npm install -D ${pkg.installName}`}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.OpenInBrowser
                title="Open on npmx.dev"
                url={pkg.npmxUrl}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
              <Action.OpenInBrowser
                title="Open on Npmjs.com"
                url={pkg.npmUrl}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.OpenInBrowser
                title="Open on GitHub"
                url={pkg.githubUrl}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
