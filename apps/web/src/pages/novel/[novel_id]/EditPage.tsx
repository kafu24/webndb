import { useState, useRef, useEffect } from "react";
import {
  IconDeviceFloppy,
  IconX,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import { SUPPORTED_TAGS, SUPPORTED_STATUSES_COLOR } from "@/data/novels";
import { SUPPORTED_LANGUAGES } from "@/data/languages";

export default function NovelEditPage({ originalNovel }) {
  const [novel, setNovel] = useState(originalNovel);

  const [openTagsIndex, setOpenTagsIndex] = useState(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openLanguageDropdown, setOpenLanguageDropdown] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [tagErrorMessage, setTagsErrorMessage] = useState("");
  const [titleErrorMessage, setTitleErrorMessage] = useState("");
  const descriptionRef = useRef(null);
  const dropdownRefs = useRef({});
  const statusDropdownRef = useRef(null);
  const languageDropdownRef = useRef(null);

  const handleChange = (field, value) => {
    setNovel((prev) => ({ ...prev, [field]: value }));
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
      const availableTagss = SUPPORTED_TAGS.filter(
        (g) => !novel.tags.includes(g),
      );

      if (availableTagss.length === 0) {
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
    } else if (field === "alternative_titles") {
      if (novel.alternative_titles.some((title) => title.trim() === "")) {
        showError(
          setTitleErrorMessage,
          "Fill in all alternative titles before adding a new one",
        );
        return;
      }

      setNovel((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
    } else {
      setNovel((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
    }
  };

  const handleArrayRemove = (field, index) => {
    setNovel((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    setOpenTagsIndex(null);
  };

  const handleSubmit = () => {
    if (!novel.title.trim()) {
      showError(setSubmitErrorMessage, "Title is required");
      return;
    }
    if (!novel.author.trim()) {
      showError(setSubmitErrorMessage, "Author is required");
      return;
    }
    if (!novel.description.trim()) {
      showError(setSubmitErrorMessage, "Description is required");
      return;
    }
    if (novel.original_language === "Select Language") {
      showError(setSubmitErrorMessage, "Original language is required");
      return;
    }

    const submissionData = {
      title: novel.title,
      author: novel.author,
      description: novel.description,
      original_language: novel.original_language,
    };

    if (novel.image) {
      submissionData.image = novel.image;
    }
    if (novel.publisher) {
      submissionData.publisher = novel.publisher;
    }
    if (novel.publishing_year) {
      submissionData.publishing_year = novel.publishing_year;
    }
    if (novel.status && novel.status !== "Select Status") {
      submissionData.status = novel.status;
    }

    const validTagss = novel.tags.filter((g) => g !== "Select");
    if (validTagss.length > 0) {
      submissionData.tags = validTagss;
    }

    const validAltTitles = novel.alternative_titles.filter(
      (t) => t.trim() !== "",
    );
    if (validAltTitles.length > 0) {
      submissionData.alternative_titles = validAltTitles;
    }

    console.log("Submitting changes:", submissionData);
    alert("Changes saved!");
  };

  const toggleTagsDropdown = (index) => {
    setOpenTagsIndex(openTagsIndex === index ? null : index);
  };

  const getAvailableTagssForIndex = (currentIndex) => {
    const currentTags = novel.tags[currentIndex];
    return SUPPORTED_TAGS.filter(
      (g) => !novel.tags.includes(g) || g === currentTags,
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openTagsIndex !== null) {
        const dropdown = dropdownRefs.current[openTagsIndex];
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenTagsIndex(null);
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openTagsIndex, openStatusDropdown, openLanguageDropdown]);

  return (
    <div>
      <div className="relative">
        <div className="flex w-full">
          <div className="relative aspect-[5/7] object-cover rounded-md z-20 w-42 h-60 border-border border">
            <img
              src={novel.image}
              className="aspect-[5/7] object-cover rounded-md z-20 w-42 h-60 border-border border"
            />
          </div>

          <div className="flex flex-col w-full">
            <div className="flex flex-col h-60 w-full">
              <div className="h-31.5 mt-1 ml-4">
                <textarea
                  value={novel.title}
                  placeholder="Title"
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="bg-accent border-input font-bold text-4xl block break-words leading-[1.1] resize-none w-full h-full focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                />
              </div>
              {/* TODO: search db */}
              <div className="flex flex-col z-25 w-full ml-4 pr-4">
                <span className="text-lg text-white flex items-center gap-2 w-full mt-2">
                  by
                  <input
                    type="text"
                    value={novel.author}
                    placeholder="Author"
                    onChange={(e) => handleChange("author", e.target.value)}
                    className="bg-accent border-input w-full px-2 h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                  />
                </span>
                <div className="mt-4">
                  <span className="text-lg font-bold">COVER IMAGE</span>
                  <input
                    type="text"
                    value={novel.image}
                    onChange={(e) => handleChange("image", e.target.value)}
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
              <div className="space-y-1">
                <p>
                  <b className="font-semibold">Status:</b>
                </p>
                <div ref={statusDropdownRef} className="relative">
                  <div className="bg-accent hover:bg-accent/80 rounded">
                    <button
                      onClick={() => setOpenStatusDropdown(!openStatusDropdown)}
                      className="w-full flex items-center justify-between px-2 py-1 text-sm font-semibold"
                    >
                      <span className={SUPPORTED_STATUSES_COLOR[novel.status]}>
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
                            {status}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* TODO: search db */}
              <div className="space-y-1">
                <p>
                  <b className="font-semibold">Publisher:</b>
                </p>
                <input
                  type="text"
                  value={novel.publisher}
                  placeholder="Publisher"
                  onChange={(e) => handleChange("publisher", e.target.value)}
                  className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                />
                <p>
                  <b className="font-semibold">Publishing Year:</b>
                </p>
                <input
                  type="number"
                  value={novel.publishing_year}
                  placeholder="Year"
                  onChange={(e) =>
                    handleChange("publishing_year", e.target.value)
                  }
                  className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                />
              </div>
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
              <div className="space-y-1">
                <div>
                  <b className="font-semibold">Alternative Title(s):</b>
                  {novel.alternative_titles.map((alt, index) => (
                    <div
                      key={index}
                      className="flex items-center mt-1 gap-1 relative"
                    >
                      <input
                        type="text"
                        value={alt}
                        placeholder="Title"
                        onChange={(e) =>
                          handleArrayChange(
                            "alternative_titles",
                            index,
                            e.target.value,
                          )
                        }
                        className="flex-1 bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                      />
                      <button
                        onClick={() =>
                          handleArrayRemove("alternative_titles", index)
                        }
                        className="text-red-400 hover:text-red-300 absolute right-2"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleArrayAdd("alternative_titles", "")}
                    className="w-full flex items-center justify-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold mt-1"
                  >
                    <IconPlus size={14} /> Add Title
                  </button>
                  {titleErrorMessage && (
                    <div className="text-sm text-red-500 mt-1 px-2">
                      {titleErrorMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-1">
              <span className="text-lg font-bold">DESCRIPTION</span>
              <textarea
                ref={descriptionRef}
                value={novel.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Description..."
                className="bg-accent border-input px-2 py-1 text-sm w-full h-40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 resize-none"
              />
            </div>

            <div className="mb-1">
              <div className="flex gap-2">
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
                        {getAvailableTagssForIndex(index).map((g) => (
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
