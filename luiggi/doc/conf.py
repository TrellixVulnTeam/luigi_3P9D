import json
import os

# -- Project information -----------------------------------------------------

project = 'Luiggi'
copyright = '2022, Niels Martignène'
author = 'Niels Martignène'

with open(os.path.dirname(__file__) + '/../package.json') as f:
    config = json.load(f)

    version = config['version']
    revision = config['version']

# -- General configuration ---------------------------------------------------

extensions = [
    'myst_parser',
    'sphinx.ext.autosectionlabel'
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

exclude_patterns = []

# -- Options for HTML output -------------------------------------------------

html_title = project

html_theme = 'furo'

html_static_path = ['static']

html_theme_options = {
    'light_css_variables': {
        'color-brand-primary': '#2485c9',
        'color-brand-content': '#2485c9'
    },
    'dark_css_variables': {
        'color-brand-primary': '#2485c9',
        'color-brand-content': '#2485c9'
    }
}

# html_link_suffix = ''

html_css_files = ['custom.css']

# -- MyST parser options -------------------------------------------------

myst_enable_extensions = [
    'linkify'
]

myst_heading_anchors = 3

myst_linkify_fuzzy_links = False

myst_number_code_blocks = ['nim', 'ruby']
