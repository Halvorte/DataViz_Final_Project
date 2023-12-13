import csv
import pandas as pd

# Read csv as dataframe
df = pd.read_csv('Annual_Average_Daily_Traffic__AADT___Beginning_1977.csv')

# Group by 'Year' and 'County', then calculate the mean of 'Count'
avg_traffic_county = df.groupby(['Year', 'County'])['Count'].mean().reset_index()

# Get the overall state traffic mean
avg_traffic_state = df.groupby(['Year'])['Count'].mean().reset_index()

avg_traffic_county.to_csv('clean_mean_traffic.csv', index=False)
avg_traffic_state.to_csv('clean_mean_traffic_state.csv', index=False)

