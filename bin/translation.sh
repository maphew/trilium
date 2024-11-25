#!/usr/bin/env bash

# --------------------------------------------------------------------------------------------------
#
# Create PO files to make easier the labor of translation.
#
# Info:
# 	https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html
# 	https://docs.translatehouse.org/projects/translate-toolkit/en/latest/commands/json2po.html
#
# Dependencies:
# 	jq
# 	translate-toolkit
# 		python-wcwidth
#
# Created by @hasecilu
#
# --------------------------------------------------------------------------------------------------

stats() {
	# Print the number of existing strings on the JSON files for each locale
	s=$(jq 'path(..) | select(length == 2) | .[1]' "${paths[0]}/en/server.json" | wc -l)
	c=$(jq 'path(..) | select(length == 2) | .[1]' "${paths[1]}/en/translation.json" | wc -l)
	echo "|locale |server strings |client strings |"
	echo "|-------|---------------|---------------|"
	echo "|  en   |      ${s}      |     ${c}      |"
	for locale in "${locales[@]}"; do
		s=$(jq 'path(..) | select(length == 2) | .[1]' "${paths[0]}/${locale}/server.json" | wc -l)
		c=$(jq 'path(..) | select(length == 2) | .[1]' "${paths[1]}/${locale}/translation.json" | wc -l)
		echo "|  ${locale}   |      ${s}      |     ${c}      |"
	done
}

help() {
	echo -e "\nDescription:"
	echo -e "\tCreate PO files to make easier the labor of translation"
	echo -e "\nUsage:"
	echo -e "\t./translation.sh [--stats] [--update <OPT_LOCALE>] [--update2 <OPT_LOCALE>]"
	echo -e "\nFlags:"
	echo -e "  --clear\n\tClear all po-* directories"
	echo -e "  --stats\n\tPrint the number of existing strings on the JSON files for each locale"
	echo -e "  --update <LOCALE>\n\tUpdate PO files from English and localized JSON files as source"
	echo -e "  --update2 <LOCALE>\n\tRecover translation from PO files to localized JSON files"
}

# Main function ------------------------------------------------------------------------------------

# Get script directory to set file path relative to it
file_path="$(
	cd -- "$(dirname "${0}")" >/dev/null 2>&1 || exit
	pwd -P
)"
paths=("${file_path}/../translations/" "${file_path}/../src/public/translations/")
locales=(cn es fr ro)

if [ $# -eq 1 ]; then
	if [ "$1" == "--clear" ]; then
		for path in "${paths[@]}"; do
			for locale in "${locales[@]}"; do
				[ -d "${path}/po-${locale}" ] && rm -r "${path}/po-${locale}"
			done
		done
	elif [ "$1" == "--stats" ]; then
		stats
	elif [ "$1" == "--update" ]; then
		# Update PO files from English and localized JSON files as source
		for path in "${paths[@]}"; do
			for locale in "${locales[@]}"; do
				json2po -t "${path}/en" "${path}/${locale}" "${path}/po-${locale}"
			done
		done
	elif [ "$1" == "--update2" ]; then
		# Recover translation from PO files to localized JSON files
		for path in "${paths[@]}"; do
			for locale in "${locales[@]}"; do
				po2json -t "${path}/en" "${path}/po-${locale}" "${path}/${locale}"
			done
		done
	else
		help
	fi
elif [ $# -eq 2 ]; then
	if [ "$1" == "--update" ]; then
		locale="$2"
		for path in "${paths[@]}"; do
			json2po -t "${path}/en" "${path}/${locale}" "${path}/po-${locale}"
		done
	elif [ "$1" == "--update2" ]; then
		locale="$2"
		for path in "${paths[@]}"; do
			po2json -t "${path}/en" "${path}/po-${locale}" "${path}/${locale}"
		done
	else
		help
	fi
else
	help
fi
