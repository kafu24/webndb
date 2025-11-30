import { useState, useEffect } from "react";
import { navigate } from "astro:transitions/client";
import {
  IconArrowNarrowLeft,
  IconArrowDown,
  IconFilter,
  IconChevronDown,
  IconGitCommit,
  IconGitCompare,
} from "@tabler/icons-react";

const history = [
  {
    revision: 3,
    date: "20:05, 2023-10-20",
    user: "JohnDoe JohnDoe JohnDoeJohnDoe",
    amount: 150.0,
    comment:
      "Initial payment for services rendered. comment comment comment comment comment comment comment comment comment",
  },
  {
    revision: 2,
    date: "20:05, 2023-10-01",
    user: "JaneSmith",
    amount: 200.0,
    comment: "Additional fee for extra features requested.",
  },
  {
    revision: 1,
    date: "20:05, 2023-09-15",
    user: "AliceW",
    amount: 50.0,
    comment: "Refund for overcharge on previous payment.",
  },
];

const novel_id = "0123";

const Radio = ({ checked, disabled, onClick }) => {
  return (
    <div className="relative isolate flex shrink-0 size-3">
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onClick}
        className="peer z-10 h-full w-full absolute inset-0 cursor-pointer opacity-0 outline-none focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
      />
      <span
        className={`
        border-input bg-background dark:bg-input/30
        peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:transition-none
        outline-none peer-focus-visible:ring-3
        absolute inset-0 rounded-full border shadow-xs
        transition-all peer-checked:[&>svg]:opacity-100
        peer-disabled:cursor-not-allowed peer-disabled:opacity-50
        flex items-center justify-center
        peer-checked:border-primary [&>svg]:fill-primary
      `}
      >
        <svg
          className={`size-1 opacity-0 transition-opacity ${checked ? "opacity-100" : ""}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="12" />
        </svg>
      </span>
    </div>
  );
};

const HistoryPage = () => {
  const [selectedRevisions, setSelectedRevisions] = useState([]);
  const [searchRev1, setSearchRev1] = useState("");
  const [searchRev2, setSearchRev2] = useState("");
  const [dropdown1Open, setDropdown1Open] = useState(false);
  const [dropdown2Open, setDropdown2Open] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const revisions = history.map((h) => h.revision);

  useEffect(() => {
    if (selectedRevisions.length >= 1) {
      setSearchRev1(selectedRevisions[0].toString());
    }
    if (selectedRevisions.length >= 2) {
      setSearchRev2(selectedRevisions[1].toString());
    }
  }, [selectedRevisions]);

  const handleRevisionToggle = (revision) => {
    setSelectedRevisions((prev) => {
      if (prev.includes(revision)) {
        return prev.filter((r) => r !== revision);
      } else {
        if (prev.length >= 2) {
          return [prev[1], revision];
        }
        return [...prev, revision];
      }
    });
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 3000);
  };

  const handleCompare = () => {
    let rev1 = searchRev1 ? parseInt(searchRev1) : null;
    let rev2 = searchRev2 ? parseInt(searchRev2) : null;

    if (!rev1 && rev2) {
      rev1 = Math.max(...revisions);
    } else if (rev1 && !rev2) {
      const rev1Index = revisions.indexOf(rev1);
      if (rev1Index < revisions.length - 1) {
        rev2 = revisions[rev1Index + 1];
      } else {
        showError(`No previous revision before ${rev1}`);
        return;
      }
    } else if (!rev1 && !rev2) {
      showError("Please select at least one revision to compare");
      return;
    }

    if (!revisions.includes(rev1)) {
      showError(`Revision ${rev1} does not exist`);
      return;
    }
    if (!revisions.includes(rev2)) {
      showError(`Revision ${rev2} does not exist`);
      return;
    }
    if (rev1 === rev2) {
      showError("Please select two different revisions");
      return;
    }

    navigate(
      `/novel/${novel_id}/history/diff/${rev1 > rev2 ? rev1 : rev2}/${rev1 > rev2 ? rev2 : rev1}`,
    );
  };

  const handleCompareSelected = () => {
    if (selectedRevisions.length !== 2) {
      showError("Please select exactly two revisions to compare");
      return;
    }
    const [rev1, rev2] = selectedRevisions.sort((a, b) => b - a);
    navigate(`/novel/${novel_id}/history/diff/${rev1}/${rev2}`);
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => window.history.back()}
            className="px-2 py-3 hover:bg-foreground/5 rounded-md transition-colors"
          >
            <IconArrowNarrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-4xl font-semibold">Novel History</h1>
        </div>

        {revisions.length > 1 ? (
          <div>
            <div className="flex gap-2">
              <span className="text-lg font-bold">diff</span>
              {errorMessage && (
                <div className="text-sm text-red-500 mt-1 px-2">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex gap-1 mt-1 max-[532px]:flex-col mb-2">
              <div className="flex relative">
                <IconGitCommit className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                <input
                  type="text"
                  value={searchRev1}
                  onChange={(e) => setSearchRev1(e.target.value)}
                  onFocus={() => setDropdown1Open(true)}
                  onBlur={() => setDropdown1Open(false)}
                  placeholder="Revision 1 (default: latest)"
                  className="pl-7 w-full bg-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 min-w-48.5 h-9 px-2 rounded-md border border-input text-sm placeholder:text-muted-foreground"
                />
                {dropdown1Open && (
                  <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                    {revisions.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">
                        No revisions found
                      </div>
                    ) : (
                      revisions.map((rev) => (
                        <div
                          key={`dropdown1-${rev}`}
                          onMouseDown={() => setSearchRev1(rev.toString())}
                          className="px-4 py-2 text-sm hover:bg-foreground/10 cursor-pointer"
                        >
                          Rev #{rev}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex relative">
                <IconGitCommit className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                <input
                  type="text"
                  value={searchRev2}
                  onChange={(e) => setSearchRev2(e.target.value)}
                  onFocus={() => setDropdown2Open(true)}
                  onBlur={() => setDropdown2Open(false)}
                  placeholder="Revision 2 (default: previous)"
                  className="pl-7 w-full bg-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 min-w-53.5 h-9 px-2 rounded-md border border-input text-sm placeholder:text-muted-foreground"
                />
                {dropdown2Open && (
                  <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                    {revisions.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">
                        No revisions found
                      </div>
                    ) : (
                      revisions.map((rev) => (
                        <div
                          key={`dropdown2-${rev}`}
                          onMouseDown={() => setSearchRev2(rev.toString())}
                          className="px-4 py-2 text-sm hover:bg-foreground/10 cursor-pointer"
                        >
                          Rev #{rev}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleCompare}
                className="h-9 px-3 inline-flex items-center justify-center rounded-md text-sm font-medium bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Compare
              </button>
            </div>
          </div>
        ) : (
          ""
        )}

        <div className="flex justify-between">
          <span className="text-lg font-bold">REVISIONS</span>
          <div className="flex gap-1 mb-1">
            <button className="flex items-center gap-1 px-2 py-1 text-sm rounded-md border border-border bg-foreground/5 hover:bg-foreground/8">
              <IconArrowDown className="w-4 h-4" />
              <span className="max-[400px]:hidden">Descending</span>
            </button>
            <button className="flex items-center gap-1 px-2 py-1 text-sm rounded-md border bg-foreground/5 hover:bg-foreground/8">
              <IconFilter className="w-4 h-4" />
              <span className="max-[400px]:hidden">Filter</span>
              <IconChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-card rounded-md border-1 border-border">
          <table className="table-fixed w-full text-xs">
            <thead>
              <tr className="border-border border-b-1 text-left text-semibold">
                <th className="pl-4 pr-2 py-2 w-14">Rev #</th>
                <th className="px-2 py-2 w-28">Date</th>
                <th className="px-2 py-2">User</th>
                <th className="pl-2 pr-4 py-2 w-18">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => {
                const isSelected = selectedRevisions.includes(entry.revision);
                const showCompareButton =
                  selectedRevisions.length === 2 && isSelected;

                return (
                  <>
                    <tr key={`radio-${index}`}>
                      <td className="pl-4 pr-2 pt-2 pb-1 w-12">
                        <div className="flex items-center gap-2 justify-center">
                          {!showCompareButton ? (
                            <Radio
                              checked={isSelected}
                              onClick={() =>
                                handleRevisionToggle(entry.revision)
                              }
                            />
                          ) : (
                            <button
                              onClick={handleCompareSelected}
                              className="size-3 flex items-center justify-center hover:bg-foreground/10 rounded transition-colors"
                              title="Compare selected revisions"
                            >
                              <IconGitCompare className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(
                                `/novel/${novel_id}/history/${entry.revision}`,
                              );
                            }}
                            className="text-blue-500 hover:underline hover:text-blue-600"
                          >
                            {entry.revision}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 pt-2 pb-1 w-28">{entry.date}</td>
                      <td
                        className="px-2 truncate break-words"
                        title={entry.user}
                      >
                        {entry.user}
                      </td>
                      <td className="pl-2 pr-4 pt-2 pb-1 w-18">
                        {entry.amount}
                      </td>
                    </tr>
                    <tr key={`comment-${index}`} className="bg-background/80">
                      <td
                        colSpan="4"
                        className={`px-4 pt-1 pb-2 text-muted-foreground ${
                          index < history.length - 1
                            ? "border-border border-b-1"
                            : ""
                        }`}
                      >
                        {entry.comment}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
