import { useState, useRef, useEffect } from "react";
import {
  IconDeviceFloppy,
  IconX,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import { SUPPORTED_TAGS, SUPPORTED_STATUSES_COLOR } from "@/data/novels";
import { SUPPORTED_LANGUAGES } from "@/data/languages";
import { STAFF_ROLES } from "@/data/staff";
import { Calendar } from "@/components/ui/calendar";
import { navigate } from "astro:transitions/client";

export default function NovelAddPage() {
  const [novel, setNovel] = useState({
    titles: [{ lang: "", title: "", latin: "", official: true }],
    original_language: "Select Language",
    description: "",
    status: "Select Status",
    start_release_date: null,
    end_release_date: null,
    image_url: null,
    staff: [],
    tags: ["Select"],
  });

  const [openTagsIndex, setOpenTagsIndex] = useState(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openLanguageDropdown, setOpenLanguageDropdown] = useState(false);
  const [openStaffRoleIndex, setOpenStaffRoleIndex] = useState(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [tagErrorMessage, setTagsErrorMessage] = useState("");
  const [titleErrorMessage, setTitleErrorMessage] = useState("");
  const [staffSearchResults, setStaffSearchResults] = useState({});
  const [staffSearchLoading, setStaffSearchLoading] = useState({});
  const [openStaffSearchIndex, setOpenStaffSearchIndex] = useState(null);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [openTitleLanguageIndex, setOpenTitleLanguageIndex] = useState(null);

  const descriptionRef = useRef(null);
  const dropdownRefs = useRef({});
  const statusDropdownRef = useRef(null);
  const languageDropdownRef = useRef(null);
  const staffRoleDropdownRefs = useRef({});
  const staffSearchDropdownRefs = useRef({});
  const startCalendarRef = useRef(null);
  const endCalendarRef = useRef(null);
  const staffSearchTimeouts = useRef({});
  const titleLanguageDropdownRefs = useRef({});

  const handleChange = (field, value) => {
    setNovel((prev) => {
      const updated = { ...prev, [field]: value };

      return updated;
    });
  };

  const handleTitleChange = (index, field, value) => {
    setNovel((prev) => ({
      ...prev,
      titles: prev.titles.map((title, i) =>
        i === index ? { ...title, [field]: value } : title,
      ),
    }));
  };

  const handleStaffChange = (index, field, value) => {
    setNovel((prev) => ({
      ...prev,
      staff: prev.staff.map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      ),
    }));

    if (field === "name") {
      if (staffSearchTimeouts.current[index]) {
        clearTimeout(staffSearchTimeouts.current[index]);
      }

      staffSearchTimeouts.current[index] = setTimeout(() => {
        searchStaff(index, value);
      }, 300);
    }
  };

  const searchStaff = async (index, query) => {
    if (!query.trim()) {
      setStaffSearchResults((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    setStaffSearchLoading((prev) => ({ ...prev, [index]: true }));

    try {
      const response = await fetch(`http://localhost:8000/staff?${query}`);
      const data = await response.json();

      setStaffSearchResults((prev) => ({
        ...prev,
        [index]: data.items || [],
      }));
      setOpenStaffSearchIndex(index);
    } catch (error) {
      console.error("Staff search error:", error);
      setStaffSearchResults((prev) => ({ ...prev, [index]: [] }));
    } finally {
      setStaffSearchLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const selectStaff = (index, staffItem) => {
    setNovel((prev) => ({
      ...prev,
      staff: prev.staff.map((member, i) =>
        i === index
          ? {
              ...member,
              name: staffItem.main_alias,
              staff_id: staffItem.staff_id,
            }
          : member,
      ),
    }));
    setOpenStaffSearchIndex(null);
  };

  const handleArrayChange = (field, index, value) => {
    setNovel((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
    setOpenTagsIndex(null);
  };

  const handleArrayAdd = (field, defaultValue = "") => {
    if (field === "tags") {
      const availableTags = SUPPORTED_TAGS.filter(
        (g) => !novel.tags.includes(g),
      );

      if (availableTags.length === 0) {
        showError(setTagsErrorMessage, `No more tags to add`);
        return;
      }
      if (novel.tags[novel.tags.length - 1] === "Select") {
        setOpenTagsIndex(novel.tags.length - 1);
        return;
      }

      setNovel((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
      setTimeout(() => setOpenTagsIndex(novel.tags.length), 0);
    } else if (field === "titles") {
      if (novel.titles.some((title) => title.title.trim() === "")) {
        showError(
          setTitleErrorMessage,
          "Fill in all titles before adding a new one",
        );
        return;
      }

      setNovel((prev) => ({
        ...prev,
        titles: [
          ...prev.titles,
          { lang: "Select Language", title: "", latin: "", official: false },
        ],
      }));
    } else if (field === "staff") {
      setNovel((prev) => ({
        ...prev,
        staff: [...prev.staff, { staff_id: "", role: "Select Role", note: "" }],
      }));
    }
  };

  const handleArrayRemove = (field, index) => {
    setNovel((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    if (field === "tags") {
      setOpenTagsIndex(null);
    } else if (field === "staff") {
      setOpenStaffRoleIndex(null);
    }
  };

  const getXsrfToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
  };

  const handleSubmit = async () => {
    if (!novel.titles[0]?.title.trim()) {
      showError(setSubmitErrorMessage, "Official title is required");
      return;
    }
    if (novel.description && novel.description.length > 10240) {
      showError(
        setSubmitErrorMessage,
        "Description must be 10240 characters or less",
      );
      return;
    }

    if (novel.original_language === "Select Language") {
      showError(setSubmitErrorMessage, "Original language is required");
      return;
    }

    const langObj = SUPPORTED_LANGUAGES.find(
      (l) => l.name === novel.original_language,
    );
    if (!langObj) {
      showError(setSubmitErrorMessage, "Invalid language selected");
      return;
    }

    const submissionData = {
      titles: novel.titles
        .filter((t) => t.title.trim() !== "")
        .map((t) => ({
          lang: t.lang,
          title: t.title.trim(),
          latin: t.latin?.trim() || null,
          official: t.official,
        })),
      original_language: langObj.code,
      status: novel.status === "Select Status" ? "unknown" : novel.status,
    };

    if (novel.description?.trim()) {
      submissionData.description = novel.description.trim();
    }

    if (novel.image_url?.trim()) {
      submissionData.image_url = novel.image_url.trim();
    }
    if (novel.start_release_date) {
      submissionData.start_release_date = novel.start_release_date;
    }
    if (novel.end_release_date) {
      submissionData.end_release_date = novel.end_release_date;
    }
    if (novel.staff.length > 0) {
      submissionData.staff = novel.staff
        .filter((s) => s.staff_id !== "" && s.role !== "Select Role")
        .map((s) => ({
          staff_id: s.staff_id,
          role: s.role,
          note: s.note?.trim(),
        }));
    }

    try {
      console.log("Submitting novel:", submissionData);
      const response = await fetch("http://localhost:8000/novels", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-XSRF-TOKEN": getXsrfToken() || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || errorData.message || "Failed to create novel",
        );
      }

      const data = await response.json();
      console.log("Novel created:", data);
      navigate(`/novel/${data.novel_id}`);
    } catch (error) {
      showError(setSubmitErrorMessage, error.message);
    }
  };

  const toggleTagsDropdown = (index) => {
    setOpenTagsIndex(openTagsIndex === index ? null : index);
  };

  const toggleStaffRoleDropdown = (index) => {
    setOpenStaffRoleIndex(openStaffRoleIndex === index ? null : index);
  };

  const toggleTitleLanguageDropdown = (index) => {
    setOpenTitleLanguageIndex(openTitleLanguageIndex === index ? null : index);
  };

  const getAvailableTagsForIndex = (currentIndex) => {
    const currentTag = novel.tags[currentIndex];
    return SUPPORTED_TAGS.filter(
      (g) => !novel.tags.includes(g) || g === currentTag,
    );
  };

  const showError = (setter, message) => {
    setter(message);
    setTimeout(() => setter(""), 3000);
  };

  const LanguageFlag = ({ language }) => {
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.name === language);
    if (!langObj) return null;
    const FlagComponent = langObj.flag;
    return <FlagComponent className="w-4 h-3" />;
  };

  const getLanguageByCode = (code) => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === code);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openTagsIndex !== null) {
        const dropdown = dropdownRefs.current[openTagsIndex];
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenTagsIndex(null);
        }
      }
      if (openStaffRoleIndex !== null) {
        const dropdown = staffRoleDropdownRefs.current[openStaffRoleIndex];
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenStaffRoleIndex(null);
        }
      }
      if (openStaffSearchIndex !== null) {
        const dropdown = staffSearchDropdownRefs.current[openStaffSearchIndex];
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenStaffSearchIndex(null);
        }
      }
      if (openTitleLanguageIndex !== null) {
        const dropdown =
          titleLanguageDropdownRefs.current[openTitleLanguageIndex];
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenTitleLanguageIndex(null);
        }
      }
      if (
        openStatusDropdown &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setOpenStatusDropdown(false);
      }
      if (
        openLanguageDropdown &&
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target)
      ) {
        setOpenLanguageDropdown(false);
      }
      if (
        startCalendarOpen &&
        startCalendarRef.current &&
        !startCalendarRef.current.contains(event.target)
      ) {
        setStartCalendarOpen(false);
      }
      if (
        endCalendarOpen &&
        endCalendarRef.current &&
        !endCalendarRef.current.contains(event.target)
      ) {
        setEndCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    openTagsIndex,
    openStaffRoleIndex,
    openStaffSearchIndex,
    openTitleLanguageIndex,
    openStatusDropdown,
    openLanguageDropdown,
    startCalendarOpen,
    endCalendarOpen,
  ]);

  return (
    <div>
      <div className="relative">
        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2">
            <div className="relative aspect-[5/7] object-cover rounded-md z-20 w-42 h-60 border-border border">
              <img
                src={novel.image_url}
                className="aspect-[5/7] object-cover rounded-md z-20 w-42 h-60 border-border border"
              />
            </div>
          </div>

          <div className="flex flex-col w-full">
            <div className="flex flex-col h-60 w-full">
              <div className="h-39 mt-1">
                <textarea
                  value={novel.titles[0]?.title || ""}
                  placeholder="Title"
                  onChange={(e) =>
                    handleTitleChange(0, "title", e.target.value)
                  }
                  className="bg-accent border-input font-bold text-4xl block break-words leading-[1.1] resize-none w-full h-full focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                />
              </div>
              <div className="flex flex-col z-25 w-full pr-4">
                <div className="mt-6">
                  <span className="text-lg font-bold">COVER IMAGE</span>
                  <input
                    type="text"
                    value={novel.image_url || ""}
                    onChange={(e) => handleChange("image_url", e.target.value)}
                    className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                    placeholder="Image URL"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex gap-4">
          <aside className="w-42 flex-shrink-0 mb-2">
            <span className="text-lg font-bold">DETAILS</span>
            <div className="flex flex-col gap-2 text-sm leading-snug">
              <div>
                <p>
                  <b className="font-semibold">Original Language:</b>
                </p>
                <div ref={languageDropdownRef} className="relative mt-1">
                  <div className="bg-accent hover:bg-accent/80 rounded">
                    <button
                      onClick={() =>
                        setOpenLanguageDropdown(!openLanguageDropdown)
                      }
                      className="w-full flex items-center justify-between px-2 py-1 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <LanguageFlag language={novel.original_language} />
                        {novel.original_language}
                      </span>
                      <IconChevronDown size={14} />
                    </button>
                  </div>
                  {openLanguageDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                      {SUPPORTED_LANGUAGES.map(({ name, flag: Flag }) => (
                        <button
                          key={name}
                          onClick={() => {
                            handleChange("original_language", name);
                            setOpenLanguageDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer"
                        >
                          <Flag className="w-4 h-3" />
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p>
                  <b className="font-semibold">Status:</b>
                </p>
                <div ref={statusDropdownRef} className="relative">
                  <div className="bg-accent hover:bg-accent/80 rounded">
                    <button
                      onClick={() => setOpenStatusDropdown(!openStatusDropdown)}
                      className="w-full flex items-center justify-between px-2 py-1 text-sm font-semibold"
                    >
                      <span
                        className={`${SUPPORTED_STATUSES_COLOR[novel.status]} capitalize`}
                      >
                        {novel.status}
                      </span>
                      <IconChevronDown size={14} />
                    </button>
                  </div>
                  {openStatusDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50">
                      {Object.entries(SUPPORTED_STATUSES_COLOR).map(
                        ([status, color]) => (
                          <button
                            key={status}
                            onClick={() => {
                              handleChange("status", status);
                              setOpenStatusDropdown(false);
                            }}
                            className={`block w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer ${color}`}
                          >
                            <span className="capitalize">{status}</span>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p>
                  <b className="font-semibold">Start Release Date:</b>
                </p>
                <div ref={startCalendarRef} className="relative">
                  <input
                    type="text"
                    value={novel.start_release_date || ""}
                    placeholder="YYYY-MM-DD"
                    onClick={() => setStartCalendarOpen(!startCalendarOpen)}
                    readOnly
                    className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 mb-2 cursor-pointer"
                  />
                  {startCalendarOpen && (
                    <div>
                      <Calendar
                        className="absolute top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md p-2"
                        mode="single"
                        selected={
                          novel.start_release_date
                            ? new Date(novel.start_release_date)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            handleChange(
                              "start_release_date",
                              date.toISOString().split("T")[0],
                            );
                          }
                          setStartCalendarOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>
                <p>
                  <b className="font-semibold">End Release Date:</b>
                </p>
                <div ref={endCalendarRef} className="relative">
                  <input
                    type="text"
                    value={novel.end_release_date || ""}
                    placeholder="YYYY-MM-DD"
                    onClick={() => setEndCalendarOpen(!endCalendarOpen)}
                    readOnly
                    className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 cursor-pointer"
                  />
                  {endCalendarOpen && (
                    <div className="absolute top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md p-2">
                      <Calendar
                        mode="single"
                        selected={
                          novel.end_release_date
                            ? new Date(novel.end_release_date)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            handleChange(
                              "end_release_date",
                              date.toISOString().split("T")[0],
                            );
                          }
                          setEndCalendarOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div>
              <div className="flex">
                <span className="text-lg font-bold">TITLES</span>
                {titleErrorMessage && (
                  <div className="text-sm text-red-500 mt-1 px-2">
                    {titleErrorMessage}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {novel.titles.map((titleObj, index) => (
                  <div key={index} className="flex gap-1 relative">
                    <div
                      ref={(el) =>
                        (titleLanguageDropdownRefs.current[index] = el)
                      }
                      className="relative"
                    >
                      <div className="bg-accent hover:bg-accent/80 rounded">
                        <button
                          onClick={() => toggleTitleLanguageDropdown(index)}
                          className="w-full flex items-center justify-between px-2 py-1 text-sm min-w-36"
                        >
                          <span className="flex items-center gap-2">
                            {getLanguageByCode(titleObj.lang) ? (
                              <>
                                <LanguageFlag
                                  language={
                                    getLanguageByCode(titleObj.lang).name
                                  }
                                />
                                {getLanguageByCode(titleObj.lang).name}
                              </>
                            ) : (
                              <div>Select Language</div>
                            )}
                          </span>
                          <IconChevronDown size={14} />
                        </button>
                      </div>
                      {openTitleLanguageIndex === index && (
                        <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                          {SUPPORTED_LANGUAGES.map(
                            ({ name, code, flag: Flag }) => (
                              <button
                                key={code}
                                onClick={() => {
                                  handleTitleChange(index, "lang", code);
                                  setOpenTitleLanguageIndex(null);
                                }}
                                className="flex items-center gap-2 w-full text-left px-2 py-1 text-xs hover:bg-foreground/10 cursor-pointer"
                              >
                                <Flag className="w-4 h-3" />
                                {name}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={titleObj.title}
                      placeholder={
                        index === 0 ? "Official Title" : "Alternative Title"
                      }
                      onChange={(e) =>
                        handleTitleChange(index, "title", e.target.value)
                      }
                      className="flex-1 bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                    />
                    <input
                      type="text"
                      value={titleObj.latin || ""}
                      placeholder="Romanized (optional)"
                      onChange={(e) =>
                        handleTitleChange(index, "latin", e.target.value)
                      }
                      className="flex-1 bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                    />
                    {index > 0 && (
                      <button
                        onClick={() => handleArrayRemove("titles", index)}
                        className="text-red-400 hover:text-red-300 absolute right-2 top-1.5"
                      >
                        <IconX size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => handleArrayAdd("titles")}
                  className="w-full flex items-center justify-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold"
                >
                  <IconPlus size={14} /> Add Title
                </button>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-lg font-bold">DESCRIPTION</span>
              <textarea
                ref={descriptionRef}
                value={novel.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Description..."
                className="bg-accent border-input px-2 py-1 text-sm w-full h-40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 resize-none"
                maxLength={10240}
              />
              <div className="flex justify-end -mt-1 text-xs text-muted-foreground">
                {novel.description.length} / 10240 characters
              </div>
            </div>

            <div>
              <div className="flex gap-2 -mt-2">
                <span className="text-lg font-bold">TAGS</span>
                {tagErrorMessage && (
                  <div className="text-sm text-red-500 mt-1 px-2">
                    {tagErrorMessage}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {novel.tags.map((tag, index) => (
                  <div
                    key={index}
                    ref={(el) => (dropdownRefs.current[index] = el)}
                    className="relative"
                  >
                    <div className="flex items-center bg-accent hover:bg-accent/80 px-2 py-1 font-semibold rounded text-sm">
                      <button
                        onClick={() => toggleTagsDropdown(index)}
                        className="flex items-center gap-1 pr-2"
                      >
                        <span>{tag}</span>
                        <IconChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArrayRemove("tags", index);
                        }}
                        className="text-red-400 hover:text-red-300 pl-1 border-l border-gray-600"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                    {openTagsIndex === index && (
                      <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                        {getAvailableTagsForIndex(index).map((g) => (
                          <button
                            key={g}
                            onClick={() => handleArrayChange("tags", index, g)}
                            className="block w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer whitespace-nowrap"
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={(e) => handleArrayAdd("tags", "Select")}
                  className="flex items-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold"
                >
                  <IconPlus size={14} className="inline" /> Add
                </button>
              </div>
            </div>

            <div className="mt-2 pb-30">
              <span className="text-lg font-bold">STAFF</span>
              <div className="flex flex-col gap-1">
                {novel.staff.map((member, index) => (
                  <div key={index} className="flex gap-1 relative">
                    <div className="flex flex-col gap-1 flex-1">
                      <div
                        ref={(el) =>
                          (staffSearchDropdownRefs.current[index] = el)
                        }
                        className="relative"
                      >
                        <input
                          type="text"
                          value={member.name}
                          placeholder="Staff Name"
                          onChange={(e) =>
                            handleStaffChange(index, "name", e.target.value)
                          }
                          className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                        />
                        {openStaffSearchIndex === index &&
                          staffSearchResults[index] &&
                          staffSearchResults[index].length > 0 && (
                            <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                              {staffSearchResults[index].map((staff) => (
                                <button
                                  key={staff.staff_id}
                                  onClick={() => selectStaff(index, staff)}
                                  className="block w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer"
                                >
                                  {staff.main_alias} ({staff.staff_id})
                                </button>
                              ))}
                            </div>
                          )}
                        {staffSearchLoading[index] && (
                          <div className="absolute right-2 top-1.5 text-xs text-muted-foreground">
                            Loading...
                          </div>
                        )}
                      </div>
                      <div
                        ref={(el) =>
                          (staffRoleDropdownRefs.current[index] = el)
                        }
                      >
                        <div className="bg-accent hover:bg-accent/80 rounded relative">
                          <button
                            onClick={() => toggleStaffRoleDropdown(index)}
                            className="w-full flex items-center justify-between px-2 py-1 text-sm"
                          >
                            <span className="capitalize">{member.role}</span>
                            <IconChevronDown size={14} />
                          </button>
                          {openStaffRoleIndex === index && (
                            <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50">
                              {STAFF_ROLES.map((role) => (
                                <button
                                  key={role}
                                  onClick={() => {
                                    handleStaffChange(index, "role", role);
                                    setOpenStaffRoleIndex(null);
                                  }}
                                  className="block w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer"
                                >
                                  <span className="capitalize">{role}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <textarea
                      value={member.note}
                      placeholder="Notes (optional)"
                      onChange={(e) =>
                        handleStaffChange(index, "note", e.target.value)
                      }
                      className="flex-1 bg-accent border-input px-2 py-1 text-sm h-15 resize-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                      rows={3}
                    />
                    <button
                      onClick={() => handleArrayRemove("staff", index)}
                      className="text-red-400 hover:text-red-300 absolute right-2 top-1"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleArrayAdd("staff")}
                  className="w-full flex items-center justify-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold"
                >
                  <IconPlus size={14} /> Add Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 fixed bottom-2 right-2 z-50">
        {submitErrorMessage && (
          <div className="flex bg-popover shadow-lg text-red-500 px-4 py-2 border border-border rounded-md items-center text-lg">
            {submitErrorMessage}
          </div>
        )}
        <button
          onClick={handleSubmit}
          className="bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors rounded-full p-3 shadow-lg"
          title="Save changes"
        >
          <IconDeviceFloppy size={32} />
        </button>
      </div>
    </div>
  );
}
