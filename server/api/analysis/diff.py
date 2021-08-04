# Automated diffing of entity and call cache data found in a dispute
from typing import Dict, List
from zipfile import ZipFile
import pandas as pd

"""
0. Gather all of the dataframes for a dispute. 
1. Congeal the dataframes into a comaprable collection.
2. Compare all dataframes of a certain type. 
3. Auto-diff items in the dataframes

"""

def get_indexer_from_path(path) -> str:
    return "indexer"

def read_zipped(path) -> Dict[str,pd.DataFrame]:
    """
    Takes a zip directory of an indexer and maps it to all of the underlying dataframes

    file_name --> DataFrame
    """
    zf =  ZipFile(path)
    dfs = {text_file.filename.split('/')[-1]: pd.read_csv(zf.open(text_file.filename),sep='\t')for text_file \
        in zf.infolist() if text_file.filename.endswith('.tsv')}
    indexer = get_indexer_from_path(path)

    indexer_df = {'indexer':indexer, 'tables': dfs}
    return indexer_df


def aggregate_dataframes(dataframe_maps: List[Dict[str,pd.DataFrame]]) -> List[List[pd.DataFrame]]:
    pass