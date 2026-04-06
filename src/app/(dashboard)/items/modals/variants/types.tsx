"use client";

export type OptionValue = {
  id: string;
  option_set_id: string;
  name: string;
  display_name: string | null;
};

export type OptionSetWithValues = {
  id: string;
  organization_id: string;
  name: string;
  display_name: string | null;
  options: OptionValue[];
};

export type VariationSetDraft = {
  id: string;
  optionSetId: string | null;
  title: string;
  selectedOptionIds: string[];
};
