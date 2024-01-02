import csv
import pandas as pd

# Read csv as dataframe
df = pd.read_csv('Annual_Average_Daily_Traffic__AADT___Beginning_1977.csv')
df_pollution = pd.read_csv('new-york-usa-air-quality.csv')

# Group by 'Year' and 'County', then calculate the mean of 'Count'
avg_traffic_county = df.groupby(['Year', 'County'])['Count'].mean().reset_index()

# Get the overall state traffic mean
avg_traffic_state = df.groupby(['Year'])['Count'].mean().reset_index()

avg_traffic_county.to_csv('clean_mean_traffic.csv', index=False)
avg_traffic_state.to_csv('clean_mean_traffic_state.csv', index=False)

# Fix the pollution dataframe
df_pollution.columns = df_pollution.columns.str.strip()
df_pollution['pm25'] = pd.to_numeric(df_pollution['pm25'], errors='coerce')
df_pollution['Year'] = pd.to_datetime(df_pollution['date']).dt.year

# Check the pollution data
print('yo')
print(df_pollution.head())
# Ensure the column names are correct
print(df_pollution.columns)


#df_pollution = df_pollution.groupby(['Year'])[['pm25', 'o3', 'no2', 'co']].mean(numeric_only=True).reset_index()
df_pollution = df_pollution.groupby(['Year'])['pm25'].mean().reset_index()
#df_pollution = df_pollution.groupby('Year')
#print(df_pollution)
print('Yaaa')
print(df_pollution)

# Combine average annual in the state with average annual pollution in the state
# Merge datasets on 'Year'
traffic_data = pd.read_csv('clean_mean_traffic_state.csv')
combined_data = pd.merge(traffic_data, df_pollution, on='Year', how='outer')

# Remove rows with NaN values
combined_data_cleaned = combined_data.dropna()

print(combined_data_cleaned)
# Export to CSV
combined_data_cleaned.to_csv('combined_data.csv', index=False)