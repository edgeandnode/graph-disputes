# Dispute analysis tools

Tools for analyzing data divergences on the network.

## Prerequisites

The tools here use Python libraries that must be installed before usage. These may be installed individually using
`pip`, but the recommended method is to install the `Conda` package which includes all the tools you'll need.

## Tools 

### Jupyter Notebooks
The Jupyter Notebook is an open-source web application that allows you to create and share documents that contain live code, equations, visualizations and narrative text.

#### Dependencies
The notebooks make use of several dependencies not included in the base conda environment.
```
conda install -c conda-forge jupyter_contrib_nbextensions jupyter_nbextensions_configurator web3
pip install itables
```   

There are some recommended but optional Jupyter extensions. To install:
```
jupyter contrib nbextension install --user
jupyter nbextension enable hide_input/main
jupyter nbextension enable hide_input_all/main 
jupyter nbextension enable execute_time/ExecuteTime 
jupyter nbextension enable collapsible_headings/main 
jupyter nbextension enable splitcell/splitcell 
jupyter nbextension enable toc2/main
```

### Setup

To spin up a Jupyter notebook server:
1. Navigate to the root analysis directory in you terminal.
2. Spin up a Jupyter server (it should automatically open in your browser)
   
    From the terminal in this directory run:
    ```    
    jupyter notebook
    ```
3. Explore one of the existing notebooks, duplicate and modify, or create your own! See the [documentation](https://jupyter.readthedocs.io/en/latest/) for help getting started. The `Template` notebooks are designed as a starting point for new analyse. Duplicate into a new one and have at it!

_note: If you create a useful/interesting notebook don't forget to commit it to this repo and push it for others to use as well!_
