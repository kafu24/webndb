import { useState, useRef, useEffect } from "react";
import {
  IconDeviceFloppy,
  IconX,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import { SUPPORTED_LANGUAGES } from "@/data/languages";
import axios from "axios";

const STAFF_TYPES = ["person", "group", "company", "other"];
const GENDERS = ["male", "female", "other", "unknown"];

export default function StaffAddPage() {
  const [staff, setStaff] = useState({
    staff_type: "Select Person",
    gender: "Select Gender",
    primary_language: "Select Language",
    main_alias: "",
    description: "",
    languages: [],
    aliases: [{ name: "", latin: "" }],
    extlinks: [{ link: "" }],
  });

  const [openLanguagesIndex, setOpenLanguagesIndex] = useState(null);
  const [openStaffTypeDropdown, setOpenStaffTypeDropdown] = useState(false);
  const [openGenderDropdown, setOpenGenderDropdown] = useState(false);
  const [openPrimaryLanguageDropdown, setOpenPrimaryLanguageDropdown] =
    useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [languageErrorMessage, setLanguageErrorMessage] = useState("");
  const [aliasErrorMessage, setAliasErrorMessage] = useState("");
  const [linkErrorMessage, setLinkErrorMessage] = useState("");

  const descriptionRef = useRef(null);
  const dropdownRefs = useRef({});
  const staffTypeDropdownRef = useRef(null);
  const genderDropdownRef = useRef(null);
  const primaryLanguageDropdownRef = useRef(null);

  const handleChange = (field, value) => {
    setStaff((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, value, subfield = null) => {
    setStaff((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => {
        if (i === index) {
          if (subfield) {
            return { ...item, [subfield]: value };
          }
          return value;
        }
        return item;
      }),
    }));
    if (field === "languages") {
      setOpenLanguagesIndex(null);
    }
  };

  const handleArrayAdd = (field, defaultValue) => {
    if (field === "languages") {
      const availableLanguages = SUPPORTED_LANGUAGES.filter(
        (lang) => !staff.languages.includes(lang.code),
      );

      if (availableLanguages.length === 0) {
        showError(setLanguageErrorMessage, "No more languages to add");
        return;
      }
      if (staff.languages[staff.languages.length - 1] === "Select") {
        setOpenLanguagesIndex(staff.languages.length - 1);
        return;
      }

      setStaff((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
      setTimeout(() => setOpenLanguagesIndex(staff.languages.length), 0);
    } else if (field === "aliases") {
      if (staff.aliases.some((alias) => alias.name.trim() === "")) {
        showError(
          setAliasErrorMessage,
          "Fill in all alias names before adding a new one",
        );
        return;
      }
      if (staff.aliases.length >= 10) {
        showError(setAliasErrorMessage, "Maximum 10 aliases allowed");
        return;
      }

      setStaff((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
    } else if (field === "extlinks") {
      if (staff.extlinks.some((link) => link.link.trim() === "")) {
        showError(
          setLinkErrorMessage,
          "Fill in all external links before adding a new one",
        );
        return;
      }
      if (staff.extlinks.length >= 10) {
        showError(setLinkErrorMessage, "Maximum 10 external links allowed");
        return;
      }

      setStaff((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
    } else {
      setStaff((prev) => ({
        ...prev,
        [field]: [...prev[field], defaultValue],
      }));
    }
  };

  const handleArrayRemove = (field, index) => {
    setStaff((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    if (field === "languages") {
      setOpenLanguagesIndex(null);
    }
  };

  const handleSubmit = async () => {
    if (!staff.main_alias.trim()) {
      showError(setSubmitErrorMessage, "Main alias is required");
      return;
    }

    if (staff.staff_type === "Select Person") {
      showError(setSubmitErrorMessage, "Staff type is required");
      return;
    }

    if (staff.gender === "Select Gender") {
      showError(setSubmitErrorMessage, "Gender is required");
      return;
    }

    if (staff.description && staff.description.length > 5000) {
      showError(
        setSubmitErrorMessage,
        "Description must be 5000 characters or less",
      );
      return;
    }

    const submissionData = {
      staff_type: staff.staff_type,
      gender: staff.gender,
      main_alias: staff.main_alias,
      languages: [],
      aliases: [],
      extlinks: [],
    };

    if (
      staff.primary_language &&
      staff.primary_language !== "Select Language"
    ) {
      submissionData.primary_language = staff.primary_language;
    }

    if (staff.description?.trim()) {
      submissionData.description = staff.description.trim();
    }

    const validLanguages = staff.languages.filter((lang) => lang !== "Select");
    if (validLanguages.length > 0) {
      submissionData.languages = validLanguages;
    }

    const validAliases = staff.aliases.filter(
      (alias) => alias.name.trim() !== "",
    );
    if (validAliases.length > 0) {
      submissionData.aliases = validAliases;
    }

    const validLinks = staff.extlinks.filter((link) => link.link.trim() !== "");
    if (validLinks.length > 0) {
      submissionData.extlinks = validLinks;
    }

    const getXsrfToken = () => {
      return document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];
    };

    try {
      console.log("Adding staff:", submissionData);
      const { data } = await axios.post(
        "http://localhost:8000/staff",
        submissionData,
        {
          withCredentials: true,
          headers: {
            "X-XSRF-TOKEN": getXsrfToken(),
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Staff created:", data);
      alert("Staff member created successfully!");
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create staff member";
      showError(setSubmitErrorMessage, message);
    }
  };

  const toggleLanguagesDropdown = (index) => {
    setOpenLanguagesIndex(openLanguagesIndex === index ? null : index);
  };

  const getAvailableLanguagesForIndex = (currentIndex) => {
    const currentLang = staff.languages[currentIndex];
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        !staff.languages.includes(lang.code) || lang.code === currentLang,
    );
  };

  const showError = (setter, message) => {
    setter(message);
    setTimeout(() => setter(""), 3000);
  };

  const LanguageFlag = ({ languageCode }) => {
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
    if (!langObj) return null;
    const FlagComponent = langObj.flag;
    return <FlagComponent className="w-4 h-3" />;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openLanguagesIndex !== null) {
        const dropdown = dropdownRefs.current[openLanguagesIndex];
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenLanguagesIndex(null);
        }
      }
      if (
        openStaffTypeDropdown &&
        staffTypeDropdownRef.current &&
        !staffTypeDropdownRef.current.contains(event.target)
      ) {
        setOpenStaffTypeDropdown(false);
      }
      if (
        openGenderDropdown &&
        genderDropdownRef.current &&
        !genderDropdownRef.current.contains(event.target)
      ) {
        setOpenGenderDropdown(false);
      }
      if (
        openPrimaryLanguageDropdown &&
        primaryLanguageDropdownRef.current &&
        !primaryLanguageDropdownRef.current.contains(event.target)
      ) {
        setOpenPrimaryLanguageDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    openLanguagesIndex,
    openStaffTypeDropdown,
    openGenderDropdown,
    openPrimaryLanguageDropdown,
  ]);

  return (
    <div>
      <div className="flex gap-4">
        <div className="flex-1 mb-1">
          <span className="text-lg font-bold">NAMES</span>
          <div className="flex flex-col text-sm leading-snug">
            <p>
              <b className="font-semibold">Name/Main Alias:</b>
            </p>
            <input
              type="text"
              value={staff.main_alias}
              placeholder="Name"
              onChange={(e) => handleChange("main_alias", e.target.value)}
              className="bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 mb-1"
            />
          </div>
          <div>
            <div>
              <div className="flex">
                <b className="font-semibold text-sm mt-1">Aliases:</b>
                {aliasErrorMessage && (
                  <div className="text-xs text-red-500 mt-1 px-2">
                    {aliasErrorMessage}
                  </div>
                )}
              </div>
              {staff.aliases.map((alias, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 relative mb-1"
                >
                  <input
                    type="text"
                    value={alias.name}
                    placeholder="Alias"
                    onChange={(e) =>
                      handleArrayChange(
                        "aliases",
                        index,
                        e.target.value,
                        "name",
                      )
                    }
                    className="flex-1 bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                  />
                  <button
                    onClick={() => handleArrayRemove("aliases", index)}
                    className="text-red-400 hover:text-red-300 absolute right-2"
                  >
                    <IconX size={14} />
                  </button>
                  <input
                    type="text"
                    value={alias.latin || ""}
                    placeholder="Romanized (optional)"
                    onChange={(e) =>
                      handleArrayChange(
                        "aliases",
                        index,
                        e.target.value,
                        "latin",
                      )
                    }
                    className="flex-1 bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  handleArrayAdd("aliases", { name: "", latin: "" })
                }
                className="w-full flex items-center justify-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold"
              >
                <IconPlus size={14} /> Add Alias
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold mt-3">LINKS</span>
            <b className="font-semibold text-sm leading-snug">
              External Links:
            </b>
            {staff.extlinks.map((extlink, index) => (
              <div key={index} className="flex items-center gap-1 relative">
                <input
                  type="text"
                  value={extlink.link}
                  placeholder="URL"
                  onChange={(e) =>
                    handleArrayChange("extlinks", index, e.target.value, "link")
                  }
                  className="flex-1 bg-accent border-input px-2 py-1 text-sm w-full h-7 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20"
                />
                <button
                  onClick={() => handleArrayRemove("extlinks", index)}
                  className="text-red-400 hover:text-red-300 absolute right-2"
                >
                  <IconX size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => handleArrayAdd("extlinks", { link: "" })}
              className="w-full flex items-center justify-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold mt-1"
            >
              <IconPlus size={14} /> Add Link
            </button>
            {linkErrorMessage && (
              <div className="text-sm text-red-500 mt-1 px-2">
                {linkErrorMessage}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <span className="text-lg font-bold">DETAILS</span>
          <div className="flex flex-col gap-2 text-sm leading-snug">
            <div>
              <p>
                <b className="font-semibold">Staff Type:</b>
              </p>
              <div ref={staffTypeDropdownRef} className="relative">
                <div className="bg-accent hover:bg-accent/80 rounded">
                  <button
                    onClick={() =>
                      setOpenStaffTypeDropdown(!openStaffTypeDropdown)
                    }
                    className="w-full flex items-center justify-between px-2 py-1 text-sm"
                  >
                    <span className="capitalize">{staff.staff_type}</span>
                    <IconChevronDown size={14} />
                  </button>
                </div>
                {openStaffTypeDropdown && (
                  <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50">
                    {STAFF_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          handleChange("staff_type", type);
                          setOpenStaffTypeDropdown(false);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer capitalize"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p>
                <b className="font-semibold">Gender:</b>
              </p>
              <div ref={genderDropdownRef} className="relative">
                <div className="bg-accent hover:bg-accent/80 rounded">
                  <button
                    onClick={() => setOpenGenderDropdown(!openGenderDropdown)}
                    className="w-full flex items-center justify-between px-2 py-1 text-sm"
                  >
                    <span className="capitalize">{staff.gender}</span>
                    <IconChevronDown size={14} />
                  </button>
                </div>
                {openGenderDropdown && (
                  <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50">
                    {GENDERS.map((gender) => (
                      <button
                        key={gender}
                        onClick={() => {
                          handleChange("gender", gender);
                          setOpenGenderDropdown(false);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer capitalize"
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mb-1">
              <div>
                <p>
                  <b className="font-semibold">Primary Language:</b>
                </p>
                <div ref={primaryLanguageDropdownRef} className="relative">
                  <div className="bg-accent hover:bg-accent/80 rounded">
                    <button
                      onClick={() =>
                        setOpenPrimaryLanguageDropdown(
                          !openPrimaryLanguageDropdown,
                        )
                      }
                      className="w-full flex items-center justify-between px-2 py-1 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        {staff.primary_language && (
                          <LanguageFlag languageCode={staff.primary_language} />
                        )}
                        {staff.primary_language
                          ? SUPPORTED_LANGUAGES.find(
                              (l) => l.code === staff.primary_language,
                            )?.name || staff.primary_language
                          : "Select Language"}
                      </span>
                      <IconChevronDown size={14} />
                    </button>
                  </div>
                  {openPrimaryLanguageDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                      <button
                        onClick={() => {
                          handleChange("primary_language", null);
                          setOpenPrimaryLanguageDropdown(false);
                        }}
                        className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer"
                      >
                        None
                      </button>
                      {SUPPORTED_LANGUAGES.map(({ name, code, flag: Flag }) => (
                        <button
                          key={code}
                          onClick={() => {
                            handleChange("primary_language", code);
                            setOpenPrimaryLanguageDropdown(false);
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
              <div className="flex mt-1">
                <b className="font-semibold mt-1">Other Language(s):</b>
                {languageErrorMessage && (
                  <div className="text-xs text-red-500 mt-1 px-2">
                    {languageErrorMessage}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {staff.languages.map((langCode, index) => (
                  <div
                    key={index}
                    ref={(el) => (dropdownRefs.current[index] = el)}
                    className="relative"
                  >
                    <div className="flex items-center bg-accent hover:bg-accent/80 px-2 py-1 font-semibold rounded text-sm">
                      <button
                        onClick={() => toggleLanguagesDropdown(index)}
                        className="flex items-center gap-1 pr-2"
                      >
                        <LanguageFlag languageCode={langCode} />
                        <span>
                          {langCode === "Select"
                            ? "Select"
                            : SUPPORTED_LANGUAGES.find(
                                (l) => l.code === langCode,
                              )?.name || langCode}
                        </span>
                        <IconChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArrayRemove("languages", index);
                        }}
                        className="text-red-400 hover:text-red-300 pl-1 border-l border-gray-600"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                    {openLanguagesIndex === index && (
                      <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                        {getAvailableLanguagesForIndex(index).map(
                          ({ name, code, flag: Flag }) => (
                            <button
                              key={code}
                              onClick={() =>
                                handleArrayChange("languages", index, code)
                              }
                              className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm hover:bg-foreground/10 cursor-pointer whitespace-nowrap"
                            >
                              <Flag className="w-4 h-3" />
                              {name}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => handleArrayAdd("languages", "Select")}
                  className="flex items-center gap-1 bg-foreground text-primary-foreground hover:bg-primary/90 transition-colors px-2 py-1 rounded-md text-sm font-semibold"
                >
                  <IconPlus size={14} className="inline" /> Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-1">
        <span className="text-lg font-bold">NOTES</span>
        <textarea
          ref={descriptionRef}
          value={staff.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Short biography or notes about the staff member..."
          className="bg-accent border-input px-2 py-1 text-sm w-full h-40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-background/20 resize-none"
          maxLength={5000}
        />
        <div className="flex justify-end -mt-1 text-xs text-muted-foreground">
          {staff.description.length} / 5000 characters
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
